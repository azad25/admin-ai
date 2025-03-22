import React from 'react';
import {
  Grid,
  useTheme,
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { AnimatedMetricsCard } from '../../AnimatedMetricsCard';
import { PerformanceInsight, SecurityInsight, UsageInsight } from '../../../types/metrics';

interface MetricsCardPanelProps {
  performanceInsights: PerformanceInsight | null;
  securityInsights: SecurityInsight | null;
  usageInsights: UsageInsight | null;
}

const MetricsCardPanel: React.FC<MetricsCardPanelProps> = ({
  performanceInsights,
  securityInsights,
  usageInsights,
}) => {
  const theme = useTheme();

  // Calculate scores and trends for each metric
  const performanceScore = performanceInsights ? 
    Math.round(100 - performanceInsights.cpu.current - performanceInsights.memory.current) : 0;
  const performanceTrend = performanceInsights?.cpu.trend || 'stable';

  const securityScore = securityInsights ? 
    Math.max(0, 100 - (securityInsights.failedLogins * 5) - (securityInsights.suspiciousActivities * 10)) : 0;
  const securityTrend = securityInsights?.vulnerabilities && securityInsights.vulnerabilities.length > 0 ? 'down' : 'up';

  const usageScore = usageInsights?.weekly?.averageLoad || 0;
  const usageTrend = usageInsights?.weekly?.trend || 'stable';

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <AnimatedMetricsCard
          icon={<SpeedIcon />}
          title="Performance"
          value={performanceScore}
          trend={performanceTrend}
          color={theme.palette.primary.main}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <AnimatedMetricsCard
          icon={<SecurityIcon />}
          title="Security"
          value={securityScore}
          trend={securityTrend}
          color={theme.palette.success.main}
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <AnimatedMetricsCard
          icon={<TrendingUpIcon />}
          title="Usage"
          value={usageScore}
          trend={usageTrend}
          color={theme.palette.info.main}
        />
      </Grid>
    </Grid>
  );
};

export default MetricsCardPanel;