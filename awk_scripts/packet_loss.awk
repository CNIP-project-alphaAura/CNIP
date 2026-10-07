# =============================================================================
# AWK Script: Packet Loss & Packet Delivery Ratio from NS-2 Trace File
# File: packet_loss.awk
# Usage: awk -f packet_loss.awk <tracefile.tr>
# =============================================================================
#
# Metrics Computed:
#   - Total Packets Sent
#   - Total Packets Received
#   - Total Packets Dropped
#   - Packet Loss Rate    (PLR) = Dropped / Sent * 100 %
#   - Packet Delivery Ratio (PDR) = Received / Sent * 100 %
#
# NS-2 Events used:
#   s = sent (at source)
#   r = received (at destination)
#   d = dropped (at any node)
# =============================================================================

BEGIN {
    print "====================================================="
    print " PACKET LOSS & PDR ANALYSIS - E-Learning NS-2 Trace "
    print "====================================================="
    print ""
}

{
    event   = $1
    time    = $2
    flow_id = $8
    pkt_type = $5

    # Count sent packets (event='s' at source, node 0 usually)
    if (event == "s") {
        sent[flow_id]++
        sent_total++
    }

    # Count received packets
    if (event == "r") {
        received[flow_id]++
        received_total++
    }

    # Count dropped packets
    if (event == "d") {
        dropped[flow_id]++
        dropped_total++

        # Track packet type-wise drops
        pkt_drops[pkt_type]++

        # Track time of drops for drop rate timeline
        drop_timeline[int(time)]++
    }
}

END {
    if (sent_total == 0) {
        print "No packets sent. Check trace file."
        exit 1
    }

    print "-----------------------------------------------------"
    print " PER-FLOW PACKET STATISTICS"
    print "-----------------------------------------------------"
    printf "%-10s %-10s %-10s %-10s %-12s %-12s\n",
           "Flow ID", "Sent", "Received", "Dropped", "PLR (%)", "PDR (%)"
    printf "%-10s %-10s %-10s %-10s %-12s %-12s\n",
           "-------", "----", "--------", "-------", "-------", "-------"

    for (fid in sent) {
        s = sent[fid]
        r = (fid in received) ? received[fid] : 0
        d = (fid in dropped)  ? dropped[fid]  : 0
        plr = (s > 0) ? (d / s) * 100 : 0
        pdr = (s > 0) ? (r / s) * 100 : 0
        printf "%-10s %-10d %-10d %-10d %-12.2f %-12.2f\n",
               fid, s, r, d, plr, pdr
    }

    print ""
    print "-----------------------------------------------------"
    print " PACKET TYPE DROP ANALYSIS"
    print "-----------------------------------------------------"
    printf "%-15s %-10s\n", "Packet Type", "Drops"
    printf "%-15s %-10s\n", "-----------", "-----"
    for (pt in pkt_drops) {
        printf "%-15s %-10d\n", pt, pkt_drops[pt]
    }

    print ""
    print "-----------------------------------------------------"
    print " DROP RATE TIMELINE (Drops per second)"
    print "-----------------------------------------------------"
    for (t = 0; t <= 10; t++) {
        if (t in drop_timeline) {
            bar_len = drop_timeline[t]
            if (bar_len > 50) bar_len = 50
            bar = ""
            for (b = 0; b < bar_len; b++) bar = bar "#"
            printf "t=%2d | %-52s %d drops\n", t, bar, drop_timeline[t]
        } else {
            printf "t=%2d | %-52s 0 drops\n", t, ""
        }
    }

    print ""
    print "-----------------------------------------------------"
    print " SYSTEM-WIDE SUMMARY"
    print "-----------------------------------------------------"

    sys_plr = (sent_total > 0) ? (dropped_total / sent_total) * 100 : 0
    sys_pdr = (sent_total > 0) ? (received_total / sent_total) * 100 : 0

    printf "Total Packets Sent     : %d\n",   sent_total
    printf "Total Packets Received : %d\n",   received_total
    printf "Total Packets Dropped  : %d\n",   dropped_total
    printf "Packet Loss Rate (PLR) : %.2f %%\n", sys_plr
    printf "Packet Delivery Ratio  : %.2f %%\n", sys_pdr
    print ""
    print " QoS Classification:"
    if (sys_plr < 1) {
        print " [ EXCELLENT ] PLR < 1% - Suitable for Exam Portal & LMS"
    } else if (sys_plr < 5) {
        print " [ GOOD      ] PLR < 5% - Acceptable for Video Streaming"
    } else if (sys_plr < 15) {
        print " [ FAIR      ] PLR < 15% - Degraded video quality"
    } else {
        print " [ POOR      ] PLR >= 15% - Network congestion critical"
    }
    print "====================================================="
}

# =============================================================================
# SAMPLE OUTPUT:
# =====================================================
#  PACKET LOSS & PDR ANALYSIS - E-Learning NS-2 Trace
# =====================================================
# -----------------------------------------------------
#  PER-FLOW PACKET STATISTICS
# -----------------------------------------------------
# Flow ID    Sent       Received   Dropped    PLR (%)      PDR (%)
# -------    ----       --------   -------    -------      -------
# 1          10234      10012      222        2.17         97.83
# 2          8523       7234       1289       15.12        84.88
# ...
# -----------------------------------------------------
#  SYSTEM-WIDE SUMMARY
# -----------------------------------------------------
# Total Packets Sent     : 45234
# Total Packets Received : 41235
# Total Packets Dropped  : 3999
# Packet Loss Rate (PLR) : 8.84 %
# Packet Delivery Ratio  : 91.16 %
#
#  QoS Classification:
#  [ FAIR      ] PLR < 15% - Degraded video quality
# =============================================================================
