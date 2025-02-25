import React from 'react';
import { useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const dummyData = [
  { time: '00:00', requests: 65, latency: 23, errors: 2 },
  { time: '01:00', requests: 59, latency: 21, errors: 1 },
  { time: '02:00', requests: 80, latency: 24, errors: 3 },
  { time: '03:00', requests: 81, latency: 22, errors: 2 },
  { time: '04:00', requests: 56, latency: 20, errors: 1 },
  { time: '05:00', requests: 55, latency: 21, errors: 2 },
  { time: '06:00', requests: 40, latency: 19, errors: 1 },
];

export const AIActivityChart: React.FC = () => {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={dummyData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="requests"
          stroke={theme.palette.primary.main}
          activeDot={{ r: 8 }}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke={theme.palette.secondary.main}
        />
        <Line
          type="monotone"
          dataKey="errors"
          stroke={theme.palette.error.main}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}; 