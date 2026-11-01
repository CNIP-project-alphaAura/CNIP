# ====================================================================
# NS-2 Simulation: Leaky Bucket Traffic Shaping for E-Learning Video
# File: leaky_bucket.tcl
#
# Concepts Demonstrated:
#   1. Bursty Traffic (Without Leaky Bucket): Student video stream
#      generates sudden high-rate bursts (4 Mbps) that overflow router
#      buffers and cause heavy packet drops.
#   2. Leaky Bucket Traffic Shaping (With Leaky Bucket): Bursts are
#      buffered in the bucket and released at a constant leak rate (1 Mbps),
#      preventing buffer overflow and eliminating packet drops.
# ====================================================================

set ns [new Simulator]

$ns color 1 Red   ;# Source 1: Bursty traffic without shaping
$ns color 2 Green ;# Source 2: Leaky bucket shaped traffic

set tracefile [open "leaky_bucket_output.tr" w]
set namfile   [open "leaky_bucket_output.nam" w]
$ns trace-all $tracefile
$ns namtrace-all $namfile

# --------------------------------------------------------------------
# 1. Topology
# --------------------------------------------------------------------
set bursty_src [new Node]
set shaped_src [new Node]
set router     [new Node]
set server     [new Node]

$bursty_src label "Bursty Video Source"
$shaped_src label "Leaky Bucket Source"
$router     label "Router"
$server     label "E-Learning Server"

# Links
$ns duplex-link $bursty_src $router 5Mb 5ms DropTail
$ns duplex-link $shaped_src $router 5Mb 5ms DropTail
$ns duplex-link $router     $server 2Mb 10ms DropTail ;# Bottleneck link

# Queue buffer limit at router
$ns queue-limit $router $server 20

# --------------------------------------------------------------------
# 2. Scenario A: Without Leaky Bucket (Bursty Video Traffic)
# High rate bursts exceed the 2Mb bottleneck link -> drops occur
# --------------------------------------------------------------------
set udp1  [new Agent/UDP]
set null1 [new Agent/Null]
$udp1 set fid_ 1
$ns attach-agent $bursty_src $udp1
$ns attach-agent $server     $null1
$ns connect $udp1 $null1

set cbr_burst [new Application/Traffic/CBR]
$cbr_burst set packetSize_ 1000
$cbr_burst set rate_ 4Mb    ;# 4 Mbps burst (exceeds 2 Mbps capacity)
$cbr_burst attach-agent $udp1

$ns at 1.0 "$cbr_burst start"
$ns at 3.0 "$cbr_burst stop"
$ns at 5.0 "$cbr_burst start"
$ns at 7.0 "$cbr_burst stop"

# --------------------------------------------------------------------
# 3. Scenario B: With Leaky Bucket (Regulated Constant Leak Rate)
# Regulated to a constant 1 Mbps leak rate -> no queue overflow
# --------------------------------------------------------------------
set udp2  [new Agent/UDP]
set null2 [new Agent/Null]
$udp2 set fid_ 2
$ns attach-agent $shaped_src $udp2
$ns attach-agent $server     $null2
$ns connect $udp2 $null2

set cbr_shaped [new Application/Traffic/CBR]
$cbr_shaped set packetSize_ 1000
$cbr_shaped set rate_ 1Mb   ;# Steady 1 Mbps leak rate
$cbr_shaped attach-agent $udp2

$ns at 1.0 "$cbr_shaped start"
$ns at 9.0 "$cbr_shaped stop"

# --------------------------------------------------------------------
# 4. Finish Procedure
# --------------------------------------------------------------------
proc finish {} {
    global ns tracefile namfile
    $ns flush-trace
    close $tracefile
    close $namfile
    puts "Leaky Bucket simulation finished."
    puts "Trace file generated: leaky_bucket_output.tr"
    puts "Analyze packet loss using: awk -f ../awk_scripts/packet_loss.awk leaky_bucket_output.tr"
    exit 0
}

$ns at 10.0 "finish"
$ns run
