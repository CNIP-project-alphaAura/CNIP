# ====================================================================
# AWK Script: Calculate End-to-End Delay from NS-2 Trace File
# Usage: awk -f delay.awk <tracefile.tr>
# ====================================================================

BEGIN {
    total_delay = 0;
    count = 0;
}

{
    event = $1;
    time = $2;
    pkt_id = $12;

    # Record the time packet was sent ('s') at the source
    if (event == "s" && !(pkt_id in send_time)) {
        send_time[pkt_id] = time;
    }

    # When packet is received ('r') at destination, compute delay
    if (event == "r" && (pkt_id in send_time)) {
        delay = time - send_time[pkt_id];
        total_delay += delay;
        count++;
        delete send_time[pkt_id]; # Free memory
    }
}

END {
    print "----------------------------------------------------";
    print "        NS-2 END-TO-END DELAY ANALYSIS RESULTS       ";
    print "----------------------------------------------------";

    if (count > 0) {
        avg_delay = (total_delay / count) * 1000; # convert seconds to ms
        printf("Total Packets Received  : %d\n", count);
        printf("Average End-to-End Delay: %.2f ms\n", avg_delay);
    } else {
        print "No packets received. Cannot calculate delay.";
    }
    print "----------------------------------------------------";
}
