# ====================================================================
# AWK Script: Calculate Packet Loss Rate (PLR) and Delivery Ratio (PDR)
# Usage: awk -f packet_loss.awk <tracefile.tr>
# ====================================================================

BEGIN {
    sent = 0;
    received = 0;
    dropped = 0;
}

{
    event = $1;

    # 's' = packet sent
    if (event == "s") {
        sent++;
        flow_sent[$8]++;
    }
    # 'r' = packet received
    else if (event == "r") {
        received++;
        flow_received[$8]++;
    }
    # 'd' = packet dropped
    else if (event == "d") {
        dropped++;
        flow_dropped[$8]++;
    }
}

END {
    print "----------------------------------------------------";
    print "       NS-2 PACKET LOSS & PDR ANALYSIS RESULTS      ";
    print "----------------------------------------------------";

    if (sent > 0) {
        pdr = (received / sent) * 100;
        plr = (dropped / sent) * 100;

        printf("Total Packets Sent          : %d\n", sent);
        printf("Total Packets Received      : %d\n", received);
        printf("Total Packets Dropped       : %d\n", dropped);
        printf("Packet Delivery Ratio (PDR) : %.2f%%\n", pdr);
        printf("Packet Loss Rate (PLR)      : %.2f%%\n", plr);

        print "\nPer-Flow Breakdown:";
        printf("%-8s %-10s %-10s %-10s %-10s\n", "Flow ID", "Sent", "Received", "Dropped", "PDR (%)");
        printf("%-8s %-10s %-10s %-10s %-10s\n", "-------", "----", "--------", "-------", "-------");
        for (f in flow_sent) {
            f_sent = flow_sent[f];
            f_recv = flow_received[f] ? flow_received[f] : 0;
            f_drop = flow_dropped[f] ? flow_dropped[f] : 0;
            f_pdr  = f_sent > 0 ? (f_recv / f_sent) * 100 : 0;
            printf("%-8s %-10d %-10d %-10d %-10.2f\n", f, f_sent, f_recv, f_drop, f_pdr);
        }
    } else {
        print "No packets recorded in trace file.";
    }
    print "----------------------------------------------------";
}
