import { useEffect, useState } from "react";
import { useSocketContext } from "../contexts/socket/useSocketContext";
import { BarChart } from "@mui/x-charts/BarChart";
import Grid from "@mui/material/Grid2";
import { Box, Typography } from "@mui/material";

type LevelCount = {
  level: string;
  count: number;
};

const GraspGaugeGraph = ({ interval = 60 * 1000 }) => {
  const maxWidth = 400;
  const maxHeight = 300;
  const socket = useSocketContext();
  const [graspData, setGraspData] = useState<LevelCount[]>([]);

  useEffect(() => {
    if (socket) {
      // Update graph with grasp reactions at realtime
      const onGraspReactionGet = (incoming: LevelCount[]) => {
        setGraspData(incoming);
      };

      const onGraspReactionReset = () => {
        setGraspData([]);
      };

      // Emit GraspReactionGet event immediately and then every minute
      socket.emit("GraspReactionGet");
      const intervalId = setInterval(() => {
        socket.emit("GraspReactionGet");
      }, interval);

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

  return (
    <Grid>
      {graspData.length > 0 ? (
        // Warning: Produces failed prop level errors in the console
        <BarChart
          dataset={graspData}
          series={[{ dataKey: "count", label: "Count" }]}
          slotProps={{ legend: { hidden: true } }}
          width={maxWidth}
          height={maxHeight}
          xAxis={[
            {
              scaleType: "band",
              dataKey: "level",
              colorMap: {
                type: "ordinal",
                colors: ["#357a38", "#ffea00", "#b2102f"],
              },
              valueFormatter: (value) =>
                value.charAt(0).toUpperCase() + value.slice(1),
            },
          ]}
          yAxis={[{ label: "Count" }]}
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
