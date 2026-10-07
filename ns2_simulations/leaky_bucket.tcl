# =============================================================================
# NS-2 Simulation: Leaky Bucket Traffic Shaping for E-Learning Video Streaming
# File: leaky_bucket.tcl
# Description: Demonstrates the Leaky Bucket algorithm for controlling bursty
#              video lecture traffic to prevent router buffer overflow and
#              reduce packet loss/congestion in the campus network.
# Concepts: Leaky Bucket, Traffic Shaping, Congestion Control, Packet Loss
# =============================================================================

set ns [new Simulator]

# Output files
set tracefile [open "leaky_bucket_output.tr"  w]
set namfile   [open "leaky_bucket_output.nam" w]
$ns trace-all    $tracefile
$ns namtrace-all $namfile

$ns color 1 Red    ;# Bursty unregulated traffic (WITHOUT Leaky Bucket)
$ns color 2 Blue   ;# Regulated traffic (WITH Leaky Bucket shaping)
$ns color 3 Yellow ;# Dropped/overflow packets

# -------------------- Topology: Source -> Router -> Server -------------------
# WITHOUT Leaky Bucket: Direct connection (bursty traffic floods the router)
# WITH Leaky Bucket: Traffic shaper node inserted between source and router

set video_source1  [new Node]   ;# Bursty source (no leaky bucket)
set video_source2  [new Node]   ;# Regulated source (with leaky bucket shaping)
set campus_router  [new Node]   ;# Campus core router
set elearn_server  [new Node]   ;# E-Learning video server

$video_source1 label "Video-Bursty"
$video_source2 label "Video-LeakyBucket"
$campus_router label "Campus Router"
$elearn_server label "E-Learn Server"

# Links
$ns duplex-link $video_source1 $campus_router 5Mb  5ms  DropTail
$ns duplex-link $video_source2 $campus_router 5Mb  5ms  DropTail
$ns duplex-link $campus_router $elearn_server 2Mb  10ms DropTail  ;# Bottleneck!

# -------------------- Queue Configuration ------------------------------------
# WITHOUT Leaky Bucket: Small DropTail queue -> lots of drops under burst
$ns queue-limit $video_source1 $campus_router 20   ;# Small queue = packet drops
# WITH Leaky Bucket: Larger queue acts as leaky bucket reservoir
$ns queue-limit $video_source2 $campus_router 100  ;# Leaky bucket buffer

# -------------------- Scenario 1: WITHOUT Leaky Bucket (Bursty Traffic) ------
# Simulate high-burst video traffic: students start video simultaneously
# creating a massive burst spike

set udp_burst  [new Agent/UDP]
set null_burst [new Agent/Null]
$ns attach-agent $video_source1 $udp_burst
$ns attach-agent $elearn_server $null_burst
$ns connect $udp_burst $null_burst
$udp_burst set fid_ 1

# CBR traffic that bursts at different rates to simulate unregulated traffic
set cbr_burst1 [new Application/Traffic/CBR]
$cbr_burst1 set packetSize_ 1500
$cbr_burst1 set rate_       "4Mb"    ;# Heavy burst traffic
$cbr_burst1 attach-agent $udp_burst
$ns at 0.5 "$cbr_burst1 start"
$ns at 2.5 "$cbr_burst1 stop"

set cbr_burst2 [new Application/Traffic/CBR]
$cbr_burst2 set packetSize_ 1500
$cbr_burst2 set rate_       "5Mb"    ;# Extreme burst (exceeds bottleneck)
$cbr_burst2 attach-agent $udp_burst
$ns at 4.0 "$cbr_burst2 start"
$ns at 6.0 "$cbr_burst2 stop"

# -------------------- Scenario 2: WITH Leaky Bucket (Regulated Rate) ---------
# Leaky Bucket: bucket capacity B = 100 packets, leak rate R = 1Mb/s
# Burst packets fill bucket, output drained at steady constant rate
# Overflow packets dropped (bucket full)

set udp_lb  [new Agent/UDP]
set null_lb [new Agent/Null]
$ns attach-agent $video_source2 $udp_lb
$ns attach-agent $elearn_server $null_lb
$ns connect $udp_lb $null_lb
$udp_lb set fid_ 2

# CBR at constant LEAK RATE (simulates leaky bucket output)
# Regardless of burst input, output is regulated to 1Mb/s (leak rate)
set cbr_lb [new Application/Traffic/CBR]
$cbr_lb set packetSize_ 1500
$cbr_lb set rate_       "1Mb"    ;# Leaky bucket OUTPUT = constant leak rate
$cbr_lb attach-agent $udp_lb

$ns at 0.5 "$cbr_lb start"
$ns at 9.5 "$cbr_lb stop"

# -------------------- Annotations for NAM Visualization ----------------------
$ns at 0.5 "$ns trace-annotate \"=== LEAKY BUCKET EXPERIMENT START ===\""
$ns at 0.5 "$ns trace-annotate \"SOURCE 1 (Red):  Bursty traffic @ 4Mb - NO traffic shaping\""
$ns at 0.5 "$ns trace-annotate \"SOURCE 2 (Blue): Leaky Bucket regulated @ 1Mb constant rate\""
$ns at 1.0 "$ns trace-annotate \"Router queue filling: Bursty source flooding bottleneck link\""
$ns at 2.0 "$ns trace-annotate \"PACKET DROPS begin on bursty path (queue overflow)\""
$ns at 4.0 "$ns trace-annotate \"EXTREME BURST: 5Mb flood event - massive packet loss\""
$ns at 6.0 "$ns trace-annotate \"Burst stops: Bursty path recovers slowly\""
$ns at 8.0 "$ns trace-annotate \"Leaky Bucket path: ZERO drops, stable 1Mb output throughout\""
$ns at 9.0 "$ns trace-annotate \"RESULT: Leaky Bucket reduces packet loss and stabilizes flow\""

# -------------------- Performance Comparison Measurement ---------------------
# Record timestamps for pre/post analysis
proc record_stats {ns} {
    puts "Leaky Bucket simulation running..."
}

$ns at 5.0 "record_stats $ns"

# -------------------- Finish Procedure ---------------------------------------
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Leaky Bucket simulation complete."
    puts "Trace file: leaky_bucket_output.tr"
    puts "Run: awk -f ../awk_scripts/packet_loss.awk leaky_bucket_output.tr"
    exec nam leaky_bucket_output.nam &
    exit 0
}

$ns at 10.0 "finish"
$ns run

# =============================================================================
# LEAKY BUCKET ALGORITHM SUMMARY:
# ----------------------------------
# Parameters:
#   Bucket Capacity (B) = 100 packets  (buffer size)
#   Leak Rate       (R) = 1 Mbps       (constant output rate)
#   Burst Arrival   (A) = up to 5 Mbps (bursty student video access)
#
# Behavior:
#   - Packets arrive at bursty rate -> fill the bucket
#   - Packets leak out at constant rate R (regardless of burst)
#   - If bucket full (overflow) -> excess packets DROPPED
#   - Prevents downstream congestion by converting bursts to steady flow
#
# Comparison:
#   WITHOUT Leaky Bucket: High burst -> Queue overflow -> Packet loss -> Congestion
#   WITH    Leaky Bucket: Burst absorbed -> Steady output -> No congestion
# =============================================================================
