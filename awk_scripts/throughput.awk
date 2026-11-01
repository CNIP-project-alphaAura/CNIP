# ====================================================================
# AWK Script: Calculate Throughput from NS-2 Trace File
# Usage: awk -f throughput.awk <tracefile.tr>
# ====================================================================

BEGIN {
    total_bytes = 0;
    start_time = 0;
    end_time = 0;
}

{
    event = $1;
    time = $2;
    pkt_size = $6;

    # Count only received packets ('r') at destination
    if (event == "r") {
        if (total_bytes == 0) {
            start_time = time;
        }
        total_bytes += pkt_size;
        end_time = time;

        # Track per-flow bytes (column 8 is flow ID)
        flow_bytes[$8] += pkt_size;
    }
}

END {
    duration = end_time - start_time;
    print "----------------------------------------------------";
    print "          NS-2 THROUGHPUT ANALYSIS RESULTS          ";
    print "----------------------------------------------------";

    if (duration > 0 && total_bytes > 0) {
        system_throughput = (total_bytes * 8) / (duration * 1000); # in Kbps

        printf("Simulation Duration : %.2f seconds\n", duration);
        printf("Total Data Received : %d bytes\n", total_bytes);
        printf("Average Throughput  : %.2f Kbps (%.2f Mbps)\n", system_throughput, system_throughput / 1000);

        print "\nThroughput per Flow ID:";
        for (f in flow_bytes) {
            flow_tput = (flow_bytes[f] * 8) / (duration * 1000);
            printf("  Flow %s : %.2f Kbps\n", f, flow_tput);
        }
    } else {
        print "No packets received. Trace file might be empty or invalid.";
    }
    print "----------------------------------------------------";
}
