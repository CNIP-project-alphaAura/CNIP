# =============================================================================
# AWK Script: End-to-End Delay & Jitter Analysis from NS-2 Trace File
# File: delay.awk
# Usage: awk -f delay.awk <tracefile.tr>
# =============================================================================
#
# End-to-End Delay = Time from packet SENT at source to packet RECEIVED at dest
# Jitter = Variation in delay between successive packets
#
# Method:
#   - Record send time when event='s' keyed by packet_id
#   - Record receive time when event='r' keyed by packet_id
#   - Delay = receive_time - send_time
# =============================================================================

BEGIN {
    print "====================================================="
    print "    END-TO-END DELAY ANALYSIS - E-Learning Network   "
    print "====================================================="
    print ""
    packet_count = 0
    total_delay  = 0
    min_delay    = 1e9
    max_delay    = 0
    prev_delay   = -1
    total_jitter = 0
    jitter_count = 0
}

{
    event    = $1
    time     = $2
    pkt_type = $5
    pkt_size = $6
    flow_id  = $8
    pkt_id   = $12

    # Record send time
    if (event == "s") {
        send_time[pkt_id]      = time
        send_flow[pkt_id]      = flow_id
    }

    # Calculate delay on receive
    if (event == "r") {
        if (pkt_id in send_time) {
            delay = time - send_time[pkt_id]

            # Accumulate per-flow stats
            flow_delay_sum[flow_id]   += delay
            flow_delay_count[flow_id]++
            flow_last_delay[flow_id]   = delay

            # Track flow-specific min/max
            if (!(flow_id in flow_min_delay) || delay < flow_min_delay[flow_id]) {
                flow_min_delay[flow_id] = delay
            }
            if (!(flow_id in flow_max_delay) || delay > flow_max_delay[flow_id]) {
                flow_max_delay[flow_id] = delay
            }

            # System-wide stats
            total_delay += delay
            packet_count++

            if (delay < min_delay) min_delay = delay
            if (delay > max_delay) max_delay = delay

            # Jitter calculation (per RFC 3550)
            if (prev_delay >= 0) {
                jitter = (delay - prev_delay)
                if (jitter < 0) jitter = -jitter
                total_jitter += jitter
                jitter_count++
            }
            prev_delay = delay

            # Remove from send_time to free memory
            delete send_time[pkt_id]
        }
    }
}

END {
    if (packet_count == 0) {
        print "No packets received. Check trace file."
        exit 1
    }

    avg_delay   = (total_delay  / packet_count) * 1000   # Convert to ms
    min_delay_ms = min_delay * 1000
    max_delay_ms = max_delay * 1000

    if (jitter_count > 0) {
        avg_jitter = (total_jitter / jitter_count) * 1000
    } else {
        avg_jitter = 0
    }

    print "-----------------------------------------------------"
    print " PER-FLOW DELAY ANALYSIS"
    print "-----------------------------------------------------"
    printf "%-10s %-12s %-15s %-15s %-15s\n",
           "Flow ID", "Packets", "Avg Delay(ms)", "Min Delay(ms)", "Max Delay(ms)"
    printf "%-10s %-12s %-15s %-15s %-15s\n",
           "-------", "-------", "-------------", "-------------", "-------------"

    for (fid in flow_delay_sum) {
        avg = (flow_delay_sum[fid] / flow_delay_count[fid]) * 1000
        mn  = flow_min_delay[fid] * 1000
        mx  = flow_max_delay[fid] * 1000
        printf "%-10s %-12d %-15.4f %-15.4f %-15.4f\n",
               fid, flow_delay_count[fid], avg, mn, mx
    }

    print ""
    print "-----------------------------------------------------"
    print " SYSTEM-WIDE DELAY & JITTER SUMMARY"
    print "-----------------------------------------------------"
    printf "Total Packets Analyzed  : %d\n",    packet_count
    printf "Average E2E Delay       : %.4f ms\n", avg_delay
    printf "Minimum E2E Delay       : %.4f ms\n", min_delay_ms
    printf "Maximum E2E Delay       : %.4f ms\n", max_delay_ms
    printf "Average Jitter (RFC3550): %.4f ms\n", avg_jitter
    print ""
    print " Delay Classification:"
    if (avg_delay < 20) {
        print " [ EXCELLENT ] Average delay < 20ms - Real-time video streaming OK"
    } else if (avg_delay < 100) {
        print " [ GOOD      ] Average delay < 100ms - LMS/Portal traffic acceptable"
    } else if (avg_delay < 300) {
        print " [ FAIR      ] Average delay < 300ms - Congestion present"
    } else {
        print " [ POOR      ] Average delay > 300ms - Severe congestion detected"
    }
    print "====================================================="
}

# =============================================================================
# SAMPLE OUTPUT:
# =====================================================
#    END-TO-END DELAY ANALYSIS - E-Learning Network
# =====================================================
# -----------------------------------------------------
#  PER-FLOW DELAY ANALYSIS
# -----------------------------------------------------
# Flow ID    Packets      Avg Delay(ms)   Min Delay(ms)   Max Delay(ms)
# -------    -------      -------------   -------------   -------------
# 1          4523         45.2300         12.1000         234.5000
# 2          3821         92.4500         15.3000         450.2000
# ...
# -----------------------------------------------------
#  SYSTEM-WIDE DELAY & JITTER SUMMARY
# -----------------------------------------------------
# Total Packets Analyzed  : 18234
# Average E2E Delay       : 68.7500 ms
# Minimum E2E Delay       : 12.1000 ms
# Maximum E2E Delay       : 450.2000 ms
# Average Jitter (RFC3550): 23.4500 ms
#
#  Delay Classification:
#  [ GOOD      ] Average delay < 100ms - LMS/Portal traffic acceptable
# =============================================================================
