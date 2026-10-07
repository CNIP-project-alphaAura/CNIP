# =============================================================================
# NS-2 Simulation: Go-Back-N / Sliding Window ARQ for E-Learning Reliability
# File: go_back_n.tcl
# Description: Demonstrates Sliding Window and Go-Back-N ARQ for reliable
#              transmission of LMS assignments and exam portal data.
# Concepts: Sliding Window, Go-Back-N, Sequence Numbers, ACK, Retransmission
# =============================================================================

set ns [new Simulator]

# Output files
set tracefile [open "gbn_output.tr"  w]
set namfile   [open "gbn_output.nam" w]
$ns trace-all    $tracefile
$ns namtrace-all $namfile

$ns color 1 Blue   ;# Normal TCP (Sliding Window)
$ns color 2 Red    ;# Retransmitted packets (Go-Back-N scenario)

# -------------------- Topology: Sender <-> Router <-> Receiver ---------------
set sender   [new Node]
set router   [new Node]
set receiver [new Node]

$sender   label "LMS Client"
$router   label "Campus Router"
$receiver label "E-Learning Server"

# Link: Sender -> Router (limited bandwidth to induce congestion/loss)
$ns duplex-link $sender   $router   2Mb 20ms DropTail
$ns duplex-link $router   $receiver 1Mb 30ms DropTail

# Reduce queue limit to force packet drops (simulate congested network)
$ns queue-limit $router $receiver 10

# -------------------- Go-Back-N via TCP (Window-Based Reliable Transmission) -

# Window sizes to compare (simulating GBN window = W)
# Small window  W=4  -> conservative, lower throughput, fewer retransmissions
# Medium window W=16 -> balanced performance
# Large window  W=64 -> aggressive, higher throughput risk, more retransmissions on loss

foreach {win_size label fid start_t} {
    4  "GBN-W4"   1  0.5
    16 "GBN-W16"  2  0.5
    64 "GBN-W64"  3  0.5
} {
    set tcp  [new Agent/TCP]
    set sink [new Agent/TCPSink]

    $tcp set window_  $win_size
    $tcp set maxcwnd_ $win_size     ;# Fix window size = GBN window
    $tcp set fid_     $fid

    $ns attach-agent $sender   $tcp
    $ns attach-agent $receiver $sink
    $ns connect      $tcp $sink

    set ftp [new Application/FTP]
    $ftp attach-agent $tcp

    $ns at $start_t "$ftp start"
    $ns at 9.5      "$ftp stop"
}

# -------------------- Packet Loss Injection to Trigger GBN Retransmission ----
# Simulate link failure / high error rate at t=3s (10% packet loss)
set loss_module [new ErrorModel]
$loss_module set rate_ 0.10      ;# 10% packet loss rate
$loss_module unit pkt
$loss_module ranvar [new RandomVariable/Uniform]
$loss_module drop-target [new Agent/Null]

# Apply loss model on the bottleneck link
$ns lossmodel $loss_module $router $receiver

# -------------------- Sliding Window Visual Annotation -----------------------
# (These annotations appear in NAM for visual demonstration of window sliding)
$ns at 0.5 "$ns trace-annotate \"=== Sliding Window / Go-Back-N Demo Start ===\""
$ns at 1.0 "$ns trace-annotate \"Sender: Window W=4  | Transmitting frames 0-3\""
$ns at 1.5 "$ns trace-annotate \"Receiver: ACK 0,1,2,3 received - Window slides forward\""
$ns at 2.0 "$ns trace-annotate \"Sender: Window W=16 | Transmitting frames 0-15\""
$ns at 3.0 "$ns trace-annotate \"=== PACKET LOSS EVENT (10% loss rate) Injected ===\""
$ns at 3.5 "$ns trace-annotate \"Go-Back-N: Timeout! Retransmitting all frames from lost packet\""
$ns at 4.0 "$ns trace-annotate \"Go-Back-N: Retransmission complete - ACK received\""
$ns at 4.5 "$ns trace-annotate \"Sender: Window W=64 | High-throughput aggressive mode\""
$ns at 5.0 "$ns trace-annotate \"Congestion detected - window reduces (Congestion Avoidance)\""

# -------------------- Finish Procedure ---------------------------------------
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Go-Back-N simulation complete."
    puts "Trace file: gbn_output.tr"
    puts "Run: awk -f ../awk_scripts/throughput.awk gbn_output.tr"
    exec nam gbn_output.nam &
    exit 0
}

$ns at 10.0 "finish"
$ns run

# =============================================================================
# EXPECTED OBSERVATIONS:
# 1. W=4  (GBN small window):  Low throughput, minimal retransmissions
# 2. W=16 (GBN medium window): Balanced throughput, some retransmissions
# 3. W=64 (GBN large window):  High throughput until loss event,
#                              then massive retransmissions (GBN behavior)
# This matches Go-Back-N: on error, ALL frames from error point are retransmitted
# =============================================================================
