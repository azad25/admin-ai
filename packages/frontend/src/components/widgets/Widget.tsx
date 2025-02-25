import { Card, CardContent, CardHeader, IconButton } from '@mui/material';
import { Settings as SettingsIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Widget as WidgetType } from '@admin-ai/shared';
import ChartWidget from './ChartWidget';
import TableWidget from './TableWidget';
import MetricWidget from './MetricWidget';
import MapWidget from './MapWidget';
import WeatherWidget from './WeatherWidget';
import StatusWidget from './StatusWidget';

interface WidgetProps {
  widget: WidgetType;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function Widget({ widget, onEdit, onDelete }: WidgetProps) {
  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'CHART':
        return <ChartWidget config={widget.config as any} />;
      case 'TABLE':
        return <TableWidget config={widget.config as any} />;
      case 'METRIC':
        return <MetricWidget config={widget.config as any} />;
      case 'MAP':
        return <MapWidget config={widget.config as any} />;
      case 'WEATHER':
        return <WeatherWidget config={widget.config as any} />;
      case 'STATUS':
        return <StatusWidget config={widget.config as any} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  return (
    <Card>
      <CardHeader
        action={
          <>
            {onEdit && (
              <IconButton onClick={onEdit} size="small">
                <SettingsIcon />
              </IconButton>
            )}
            {onDelete && (
              <IconButton onClick={onDelete} size="small">
                <DeleteIcon />
              </IconButton>
            )}
          </>
        }
        title={widget.name}
      />
      <CardContent>{renderWidgetContent()}</CardContent>
    </Card>
  );
} 