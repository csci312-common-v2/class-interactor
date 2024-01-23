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
  const socket = useSocketContext();
  const [graspData, setGraspData] = useState<LevelCount[]>([]);

  useEffect(() => {
    if (socket) {
      // Update graph with grasp reactions at realtime
      const mapAndSetData = (incoming: LevelCount[]) => {
        const updatedIncoming = incoming.map((item) => ({
          ...item,
          count: Number(item.count),
        }));
        setGraspData(updatedIncoming); // Do we need to have a merge?
      };

      const onGraspReactionReset = () => {
        setGraspData([]);
      };

      // Listen for events
      socket.on("GraspReactionGet", mapAndSetData);
      socket.on("GraspReactionSend", mapAndSetData);
      socket.on("GraspReactionReset", onGraspReactionReset);

      // Make sure to remove listener when component is unmounted
      return () => {
        socket.off("GraspReactionGet", mapAndSetData);
        socket.off("GraspReactionSend", mapAndSetData);
        socket.off("GraspReactionReset", onGraspReactionReset);
      };
    }
  }, [socket]);

  return (
    <Grid>
      {graspData.length > 0 ? (
        // Warning: Produces failed prop level errors in the console
        <BarChart
          dataset={graspData}
          xAxis={[{ scaleType: "band", dataKey: "level" }]}
          series={[{ dataKey: "count" }]}
          width={200}
          height={300}
        />
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          maxWidth="200px"
          minHeight="300px"
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
