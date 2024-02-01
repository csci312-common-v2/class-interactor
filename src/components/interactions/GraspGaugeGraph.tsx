import { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { BarChart } from "@mui/x-charts/BarChart";
import Grid from "@mui/material/Grid";
import { Box, Typography } from "@mui/material";

type LevelCount = {
  level: string;
  count: number;
};

const GraspGaugeGraph = () => {
  const maxWidth = 400;
  const maxHeight = 300;
  const socket = useSocketContext();
  const [graspData, setGraspData] = useState<LevelCount[]>([]);

  useEffect(() => {
    if (socket) {
      // Update graph with grasp reactions at realtime
      const onGraspReactionGet = (incoming: LevelCount[]) => {
        const updatedIncoming = incoming.map((item) => ({
          ...item,
          count: item.count,
        }));
        setGraspData(updatedIncoming);
      };

      const onGraspReactionReset = () => {
        setGraspData([]);
      };

      // Emit GraspReactionGet event every minute
      const intervalId = setInterval(() => {
        socket.emit("GraspReactionGet");
      }, 60 * 1000);

      // Listen for events
      socket.on("GraspReactionGet", onGraspReactionGet);
      socket.on("GraspReactionReset", onGraspReactionReset);

      // Make sure to remove listener and clear interval when component is unmounted
      return () => {
        socket.off("GraspReactionGet", onGraspReactionGet);
        socket.off("GraspReactionReset", onGraspReactionReset);
        clearInterval(intervalId);
      };
    }
  }, [socket]);

  // Convert data for chart to properly format
  const chartData = graspData.reduce(
    (acc: { [key: string]: number | string }, item) => {
      acc[item.level] = item.count;
      return acc;
    },
    {},
  );
  // Need to add another key for xAxis dataKey
  chartData["series"] = "Grasp Reactions";

  // Create series data to enable coloring of bars
  const seriesData = Object.keys(chartData)
    .filter((level) => level !== "series") // Exclude 'series' from the keys
    .map((level) => {
      return {
        dataKey: level,
        label: `${level.charAt(0).toUpperCase() + level.slice(1)}`,
      };
    });

  return (
    <Grid>
      {graspData.length > 0 ? (
        // Warning: Produces failed prop level errors in the console
        <BarChart
          dataset={[chartData]}
          series={seriesData}
          xAxis={[{ scaleType: "band", dataKey: "series" }]}
          slotProps={{ legend: { hidden: true } }}
          colors={["#357a38", "#ffea00", "#b2102f"]}
          width={maxWidth}
          height={maxHeight}
        />
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          maxWidth={`${maxWidth}px`}
          minHeight={`${maxHeight}px`}
          border={1}
          borderColor="grey.300"
          borderRadius={1}
        >
          <Typography variant="body1" align="center">
            No grasp data available
          </Typography>
        </Box>
      )}
    </Grid>
  );
};

export default GraspGaugeGraph;
