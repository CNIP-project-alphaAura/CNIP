# ====================================================================
# NS-2 Simulation: Sliding Window & Go-Back-N ARQ Demonstration
# File: go_back_n.tcl
#
# Concepts Demonstrated:
#   1. Sliding Window: Sender transmits frames within a window size W.
#   2. Go-Back-N: On frame loss or timeout, sender retransmits the lost
#      frame and all subsequent frames in the current window.
#   3. Impact of Window Size (W=4, 16, 64) on throughput and retransmission.
# ====================================================================

set ns [new Simulator]

# Set colors for visualization
$ns color 1 Blue   ;# Window W=4
$ns color 2 Orange ;# Window W=16
$ns color 3 Red    ;# Window W=64

set tracefile [open "gbn_output.tr" w]
set namfile   [open "gbn_output.nam" w]
$ns trace-all $tracefile
$ns namtrace-all $namfile

# --------------------------------------------------------------------
# 1. Topology: Sender (Student) -> Router -> Receiver (LMS Server)
# --------------------------------------------------------------------
set sender   [new Node]
set router   [new Node]
set receiver [new Node]

$sender   label "Student (Sender)"
$router   label "Router"
$receiver label "LMS Server (Receiver)"

$ns duplex-link $sender   $router   2Mb 20ms DropTail
$ns duplex-link $router   $receiver 1Mb 30ms DropTail

# Small queue at router to simulate bottleneck buffer
$ns queue-limit $router $receiver 10

# --------------------------------------------------------------------
# 2. Inject Packet Loss Model (10% Loss Rate)
# --------------------------------------------------------------------
set loss_mod [new ErrorModel]
$loss_mod set rate_ 0.10
$loss_mod unit pkt
$loss_mod ranvar [new RandomVariable/Uniform]
$loss_mod drop-target [new Agent/Null]

# Apply loss model between router and receiver
$ns lossmodel $loss_mod $router $receiver

# --------------------------------------------------------------------
# 3. Setup Go-Back-N TCP Connections with Different Window Sizes
# --------------------------------------------------------------------
# Window sizes: W=4 (Small), W=16 (Medium), W=64 (Large)
foreach {w fid} {4 1 16 2 64 3} {
    set tcp [new Agent/TCP]
    set sink [new Agent/TCPSink]

    $tcp set window_  $w
    $tcp set maxcwnd_ $w
    $tcp set fid_     $fid

    $ns attach-agent $sender   $tcp
    $ns attach-agent $receiver $sink
    $ns connect $tcp $sink

    set ftp [new Application/FTP]
    $ftp attach-agent $tcp
    $ns at 0.5 "$ftp start"
    $ns at 9.5 "$ftp stop"
}

# --------------------------------------------------------------------
# 4. Finish Procedure
# --------------------------------------------------------------------
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Go-Back-N simulation finished."
    puts "Trace file generated: gbn_output.tr"
    puts "Analyze results using: awk -f ../awk_scripts/throughput.awk gbn_output.tr"
    exit 0
}

$ns at 10.0 "finish"
$ns run
