# =============================================================================
# NS-2 Simulation: Network Performance Analysis of University E-Learning System
# File: elearning_topology.tcl
# Description: Simulates university network with e-learning services under
#              varying traffic loads (Low: 10, Medium: 30, High: 100 users)
#              Compares TCP and UDP under LMS, Video, Exam, Student Portal traffic
# Concepts: TCP/UDP, Congestion, Packet Loss, Throughput, Delay, PDR
# =============================================================================

# -------------------- Simulator Initialization --------------------------------
set ns [new Simulator]

# Enable Differentiated Services (color-coded packet tracing)
$ns color 1 Blue      ;# TCP - LMS / Exam Portal
$ns color 2 Red       ;# UDP - Video Lectures
$ns color 3 Green     ;# TCP - Student Portal
$ns color 4 Yellow    ;# UDP - Live Classes

# -------------------- Output Files -------------------------------------------
set tracefile [open "elearning_output.tr" w]
set namfile   [open "elearning_output.nam" w]
$ns trace-all    $tracefile
$ns namtrace-all $namfile

# -------------------- Topology Parameters ------------------------------------
# Network Bandwidth and Delay Parameters
# Core Link: Server <-> Gateway Router
set core_bw  "100Mb"
set core_dly "2ms"

# Distribution Link: Gateway <-> Access Switch
set dist_bw  "10Mb"
set dist_dly "5ms"

# Access Link: Switch <-> Student Nodes
set acc_bw   "1Mb"
set acc_dly  "10ms"

# -------------------- Node Creation ------------------------------------------
# Infrastructure Nodes
set elearning_server [new Node]   ;# Node 0: University E-Learning Server
set gateway          [new Node]   ;# Node 1: Campus Gateway Router
set core_switch      [new Node]   ;# Node 2: Core Network Switch
set access_switch1   [new Node]   ;# Node 3: Access Switch - Lab Block A
set access_switch2   [new Node]   ;# Node 4: Access Switch - Lab Block B

$elearning_server label "E-Learning Server"
$gateway          label "Gateway Router"
$core_switch      label "Core Switch"
$access_switch1   label "Access SW-A"
$access_switch2   label "Access SW-B"

# Student Nodes -- Low Traffic Scenario: 10 students
# For medium/high traffic, additional student nodes added dynamically
set num_students 10          ;# Change to 30 (medium) or 100 (high)

set students {}
for {set i 0} {$i < $num_students} {incr i} {
    set s [new Node]
    lappend students $s
}

# -------------------- Link Creation ------------------------------------------
# Core Infrastructure Links
$ns duplex-link $elearning_server $gateway         $core_bw $core_dly DropTail
$ns duplex-link $gateway          $core_switch     $core_bw $core_dly DropTail
$ns duplex-link $core_switch      $access_switch1  $dist_bw $dist_dly DropTail
$ns duplex-link $core_switch      $access_switch2  $dist_bw $dist_dly DropTail

# Student Access Links
set half [expr $num_students / 2]
for {set i 0} {$i < $num_students} {incr i} {
    if {$i < $half} {
        $ns duplex-link [lindex $students $i] $access_switch1 $acc_bw $acc_dly DropTail
    } else {
        $ns duplex-link [lindex $students $i] $access_switch2 $acc_bw $acc_dly DropTail
    }
}

# -------------------- Queue Settings (for Leaky Bucket effect) ---------------
$ns queue-limit $gateway $core_switch 50

# -------------------- Traffic Setup: E-Learning Applications -----------------
# Application Port Assignments:
#   Port 80/443  -> LMS (TCP)
#   Port 1935    -> Video Streaming (UDP/CBR)
#   Port 8080    -> Exam Portal (TCP)
#   Port 3000    -> Student Portal (TCP)

set traffic_flows {}

for {set i 0} {$i < $num_students} {incr i} {
    set student [lindex $students $i]
    set flow_type [expr $i % 4]

    if {$flow_type == 0} {
        # --- LMS Traffic: TCP FTP (file uploads/downloads) ---
        set tcp_agent [new Agent/TCP]
        set tcp_sink  [new Agent/TCPSink]
        $ns attach-agent $student          $tcp_agent
        $ns attach-agent $elearning_server $tcp_sink
        $ns connect $tcp_agent $tcp_sink
        $tcp_agent set fid_ 1
        $tcp_agent set window_ 32

        set ftp_app [new Application/FTP]
        $ftp_app attach-agent $tcp_agent
        $ns at [expr 0.1 + $i * 0.05] "$ftp_app start"
        $ns at 9.5                    "$ftp_app stop"
        lappend traffic_flows [list "LMS-TCP" $i]

    } elseif {$flow_type == 1} {
        # --- Video Lecture Streaming: UDP/CBR (Real-time video) ---
        set udp_agent  [new Agent/UDP]
        set udp_null   [new Agent/Null]
        $ns attach-agent $student          $udp_agent
        $ns attach-agent $elearning_server $udp_null
        $ns connect $udp_agent $udp_null
        $udp_agent set fid_ 2

        set cbr_app [new Application/Traffic/CBR]
        $cbr_app set packetSize_ 1000
        $cbr_app set rate_       "512Kb"
        $cbr_app attach-agent $udp_agent
        $ns at [expr 0.2 + $i * 0.05] "$cbr_app start"
        $ns at 9.5                     "$cbr_app stop"
        lappend traffic_flows [list "VideoUDP" $i]

    } elseif {$flow_type == 2} {
        # --- Exam Portal: TCP (Reliable, ordered delivery critical) ---
        set tcp_agent [new Agent/TCP/Reno]
        set tcp_sink  [new Agent/TCPSink]
        $ns attach-agent $student          $tcp_agent
        $ns attach-agent $elearning_server $tcp_sink
        $ns connect $tcp_agent $tcp_sink
        $tcp_agent set fid_ 1
        $tcp_agent set window_ 64

        set ftp_app [new Application/FTP]
        $ftp_app attach-agent $tcp_agent
        $ns at [expr 0.15 + $i * 0.05] "$ftp_app start"
        $ns at 9.5                      "$ftp_app stop"
        lappend traffic_flows [list "ExamPortal-TCP" $i]

    } else {
        # --- Student Portal: UDP/CBR (Profile updates, announcements) ---
        set udp_agent [new Agent/UDP]
        set udp_null  [new Agent/Null]
        $ns attach-agent $student          $udp_agent
        $ns attach-agent $elearning_server $udp_null
        $ns connect $udp_agent $udp_null
        $udp_agent set fid_ 4

        set cbr_app [new Application/Traffic/CBR]
        $cbr_app set packetSize_ 512
        $cbr_app set rate_       "256Kb"
        $cbr_app attach-agent $udp_agent
        $ns at [expr 0.25 + $i * 0.05] "$cbr_app start"
        $ns at 9.5                      "$cbr_app stop"
        lappend traffic_flows [list "StudentPortal-UDP" $i]
    }
}

# -------------------- Congestion Simulation (High Traffic Trigger) ------------
# Simulate a burst event at t=5s to trigger congestion
proc inject_burst {ns server students} {
    set burst_count 3
    for {set b 0} {$b < $burst_count} {incr b} {
        set bidx [expr int(rand() * [llength $students])]
        set bs [lindex $students $bidx]
        set btcp [new Agent/UDP]
        set bsink [new Agent/Null]
        $ns attach-agent $bs     $btcp
        $ns attach-agent $server $bsink
        $ns connect $btcp $bsink
        set bcbr [new Application/Traffic/CBR]
        $bcbr set packetSize_ 1500
        $bcbr set rate_ "2Mb"
        $bcbr attach-agent $btcp
        $ns at 5.0 "$bcbr start"
        $ns at 6.0 "$bcbr stop"
    }
}

inject_burst $ns $elearning_server $students

# -------------------- NAM Topology Layout ------------------------------------
$ns duplex-link-op $elearning_server $gateway        orient right
$ns duplex-link-op $gateway          $core_switch    orient right
$ns duplex-link-op $core_switch      $access_switch1 orient right-up
$ns duplex-link-op $core_switch      $access_switch2 orient right-down

# -------------------- Simulation Control ------------------------------------
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Simulation complete. Trace: elearning_output.tr | NAM: elearning_output.nam"
    puts "Run AWK scripts to extract performance metrics."
    exec nam elearning_output.nam &
    exit 0
}

$ns at 10.0 "finish"
$ns run

# =============================================================================
# HOW TO RUN (Linux/WSL):
#   ns elearning_topology.tcl
#
# TO CHANGE TRAFFIC LOAD:
#   Low    traffic: set num_students 10
#   Medium traffic: set num_students 30
#   High   traffic: set num_students 100
#
# THEN ANALYZE:
#   awk -f ../awk_scripts/throughput.awk  elearning_output.tr
#   awk -f ../awk_scripts/delay.awk       elearning_output.tr
#   awk -f ../awk_scripts/packet_loss.awk elearning_output.tr
# =============================================================================
