# ====================================================================
# NS-2 Simulation: University E-Learning System Network Performance
# File: elearning_topology.tcl
#
# Scenario:
#   Simulates an e-learning environment with:
#     - E-Learning Server (Node 0)
#     - Campus Core Router (Node 1)
#     - Student Nodes (Nodes 2..N)
#
# Services Modeled:
#   1. Learning Management System (LMS): TCP
#   2. Examination Portal: TCP (Reliable delivery)
#   3. Video Lectures: UDP/CBR (Real-time, delay-sensitive)
#   4. Student Portal: UDP/CBR (General access)
#
# Traffic Loads:
#   - Low: 10 students
#   - Medium: 30 students
#   - High: 100 students
# ====================================================================

set ns [new Simulator]

# Set color codes for NAM visualization
$ns color 1 Blue    ;# TCP: LMS & Exam Portal
$ns color 2 Red     ;# UDP: Video Lectures
$ns color 3 Green   ;# UDP: Student Portal

# Open trace and animation files
set tracefile [open "elearning_output.tr" w]
set namfile   [open "elearning_output.nam" w]
$ns trace-all $tracefile
$ns namtrace-all $namfile

# --------------------------------------------------------------------
# 1. Traffic Load Configuration
# Change 'num_students' to 10 (Low), 30 (Medium), or 100 (High)
# --------------------------------------------------------------------
set num_students 10
if {$argc > 0} {
    set num_students [lindex $argv 0]
}
puts "Simulating E-Learning Network with $num_students students..."

# --------------------------------------------------------------------
# 2. Node Creation
# --------------------------------------------------------------------
set server [new Node]
set router [new Node]
$server label "E-Learning Server"
$router label "Campus Router"

# Bottleneck link between Server and Campus Router
# 10 Mbps bandwidth, 5ms propagation delay, DropTail queue of size 50
$ns duplex-link $server $router 10Mb 5ms DropTail
$ns queue-limit $server $router 50

# Create student nodes and connect them to the router
set students {}
for {set i 0} {$i < $num_students} {incr i} {
    set s [new Node]
    $s label "Student-$i"
    lappend students $s
    # Each student link: 2 Mbps bandwidth, 10ms delay
    $ns duplex-link $s $router 2Mb 10ms DropTail
}

# --------------------------------------------------------------------
# 3. Traffic Flows (LMS, Video, Exam, Portal)
# --------------------------------------------------------------------
for {set i 0} {$i < $num_students} {incr i} {
    set s [lindex $students $i]
    set flow_type [expr $i % 4]

    if {$flow_type == 0} {
        # Flow 0: LMS (TCP)
        set tcp [new Agent/TCP]
        set sink [new Agent/TCPSink]
        $tcp set fid_ 1
        $tcp set window_ 32
        $ns attach-agent $s $tcp
        $ns attach-agent $server $sink
        $ns connect $tcp $sink

        set ftp [new Application/FTP]
        $ftp attach-agent $tcp
        $ns at 0.5 "$ftp start"
        $ns at 9.5 "$ftp stop"

    } elseif {$flow_type == 1} {
        # Flow 1: Video Lectures (UDP / CBR)
        set udp [new Agent/UDP]
        set null [new Agent/Null]
        $udp set fid_ 2
        $ns attach-agent $s $udp
        $ns attach-agent $server $null
        $ns connect $udp $null

        set cbr [new Application/Traffic/CBR]
        $cbr set packetSize_ 1000
        $cbr set rate_ 512Kb
        $cbr attach-agent $udp
        $ns at 0.5 "$cbr start"
        $ns at 9.5 "$cbr stop"

    } elseif {$flow_type == 2} {
        # Flow 2: Examination Portal (TCP Reno)
        set tcp [new Agent/TCP/Reno]
        set sink [new Agent/TCPSink]
        $tcp set fid_ 1
        $tcp set window_ 64
        $ns attach-agent $s $tcp
        $ns attach-agent $server $sink
        $ns connect $tcp $sink

        set ftp [new Application/FTP]
        $ftp attach-agent $tcp
        $ns at 0.5 "$ftp start"
        $ns at 9.5 "$ftp stop"

    } else {
        # Flow 3: Student Portal (UDP / CBR)
        set udp [new Agent/UDP]
        set null [new Agent/Null]
        $udp set fid_ 3
        $ns attach-agent $s $udp
        $ns attach-agent $server $null
        $ns connect $udp $null

        set cbr [new Application/Traffic/CBR]
        $cbr set packetSize_ 512
        $cbr set rate_ 256Kb
        $cbr attach-agent $udp
        $ns at 0.5 "$cbr start"
        $ns at 9.5 "$cbr stop"
    }
}

# --------------------------------------------------------------------
# 4. Finish Procedure
# --------------------------------------------------------------------
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Simulation finished."
    puts "Trace file generated: elearning_output.tr"
    puts "To analyze throughput: awk -f ../awk_scripts/throughput.awk elearning_output.tr"
    puts "To analyze delay     : awk -f ../awk_scripts/delay.awk elearning_output.tr"
    puts "To analyze loss/PDR  : awk -f ../awk_scripts/packet_loss.awk elearning_output.tr"
    exit 0
}

$ns at 10.0 "finish"
$ns run
