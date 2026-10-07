# =============================================================================
# AWK Script: Throughput Analysis from NS-2 Trace File
# File: throughput.awk
# Usage: awk -f throughput.awk <tracefile.tr>
# =============================================================================
#
# NS-2 Trace Format:
#   <event> <time> <from_node> <to_node> <pkt_type> <pkt_size> <flags>
#            <flow_id> <src_addr> <dst_addr> <seq_no> <pkt_id>
#
# Events:
#   s = sent
#   r = received
#   d = dropped
#   f = forwarded
#
# This script calculates:
#   1. Total Throughput per Flow (Kbps)
#   2. Average System Throughput (Kbps)
#   3. Instantaneous Throughput per 0.5s interval
# =============================================================================

BEGIN {
    print "====================================================="
    print "     THROUGHPUT ANALYSIS - E-Learning NS-2 Trace    "
    print "====================================================="
    print ""
    interval    = 0.5        # Time interval for instantaneous throughput (seconds)
    next_record = interval
}

{
    event     = $1
    time      = $2
    from_node = $3
    to_node   = $4
    pkt_type  = $5
    pkt_size  = $6
    flow_id   = $8

    # Count RECEIVED packets (event = 'r') for throughput calculation
    if (event == "r") {
        total_bytes[flow_id]      += pkt_size
        total_received[flow_id]++
        last_time[flow_id]         = time

        # Track first arrival time per flow
        if (!(flow_id in first_time)) {
            first_time[flow_id] = time
        }

        # System-wide counters
        sys_total_bytes += pkt_size
        sys_last_time    = time
        if (sys_first_time == "") {
            sys_first_time = time
        }

        # Instantaneous throughput (interval-based)
        interval_bytes[flow_id] += pkt_size
        if (time >= next_record) {
            printf "[t=%.1f] Flow %d Instant Throughput: %.2f Kbps\n",
                   time, flow_id, (interval_bytes[flow_id] * 8) / (interval * 1000)
            interval_bytes[flow_id] = 0
            next_record += interval
        }
    }
}

END {
    print ""
    print "-----------------------------------------------------"
    print " PER-FLOW THROUGHPUT SUMMARY"
    print "-----------------------------------------------------"
    printf "%-10s %-12s %-15s %-15s\n", "Flow ID", "Bytes Rcvd", "Duration(s)", "Throughput(Kbps)"
    printf "%-10s %-12s %-15s %-15s\n", "-------", "----------", "-----------", "----------------"

    total_sys_tput = 0
    for (fid in total_bytes) {
        duration = last_time[fid] - first_time[fid]
        if (duration > 0) {
            tput = (total_bytes[fid] * 8) / (duration * 1000)
        } else {
            tput = 0
        }
        printf "%-10s %-12d %-15.3f %-15.2f\n", fid, total_bytes[fid], duration, tput
        total_sys_tput += tput
    }

    print ""
    print "-----------------------------------------------------"
    print " SYSTEM-WIDE THROUGHPUT"
    print "-----------------------------------------------------"

    sys_duration = sys_last_time - sys_first_time
    if (sys_duration > 0) {
        sys_tput = (sys_total_bytes * 8) / (sys_duration * 1000)
    } else {
        sys_tput = 0
    }

    printf "Total Bytes Received : %d bytes\n", sys_total_bytes
    printf "Simulation Duration  : %.3f seconds\n", sys_duration
    printf "System Throughput    : %.2f Kbps (%.4f Mbps)\n", sys_tput, sys_tput/1000
    printf "Sum of Flow Tputs    : %.2f Kbps\n", total_sys_tput
    print "====================================================="
}

# =============================================================================
# SAMPLE OUTPUT:
# =====================================================
#      THROUGHPUT ANALYSIS - E-Learning NS-2 Trace
# =====================================================
#
# [t=0.5] Flow 1 Instant Throughput: 245.30 Kbps
# [t=1.0] Flow 1 Instant Throughput: 312.50 Kbps
# [t=0.5] Flow 2 Instant Throughput: 512.00 Kbps
# ...
# -----------------------------------------------------
#  PER-FLOW THROUGHPUT SUMMARY
# -----------------------------------------------------
# Flow ID    Bytes Rcvd   Duration(s)     Throughput(Kbps)
# -------    ----------   -----------     ----------------
# 1          1234567      9.100           1085.45
# 2          2345678      9.200           2039.72
# ...
# -----------------------------------------------------
#  SYSTEM-WIDE THROUGHPUT
# -----------------------------------------------------
# Total Bytes Received : 5234567 bytes
# Simulation Duration  : 9.400 seconds
# System Throughput    : 4453.28 Kbps (4.4533 Mbps)
# =============================================================================
