import React, { useState, useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DefaultApi } from 'src/openapi';
import { useAlerts } from '@app/common/MASAlerts/MASAlerts';
import { isServiceApiError } from '@app/utils';
import { AuthContext } from '@app/auth/AuthContext';
import { ApiContext } from '@app/api/ApiContext';
import { 
  AlertVariant,
  Bullseye,
  Card,
  CardTitle,
  CardBody,
  Spinner
} from '@patternfly/react-core';
import {
  Chart,
  ChartArea,
  ChartAxis,
  ChartGroup,
  ChartLegend,
  ChartThemeColor,
  ChartThreshold,
  ChartVoronoiContainer
} from '@patternfly/react-charts';
import chart_color_blue_300 from '@patternfly/react-tokens/dist/js/chart_color_blue_300';
import chart_color_orange_300 from '@patternfly/react-tokens/dist/js/chart_color_orange_300';
import chart_color_green_300 from '@patternfly/react-tokens/dist/js/chart_color_green_300';
import chart_color_black_500 from '@patternfly/react-tokens/dist/js/chart_color_black_500';
import { format } from 'date-fns';
import byteSize from 'byte-size';
import { ChartEmptyState } from './ChartEmptyState';
import { useTimeout } from '@app/hooks/useTimeout';
import { getLargestByteSize, convertToSpecifiedByte, getMaxValueOfArray} from './utils';

type Broker = {
  name: string
  data: {
    timestamp: number
    bytes: number[]
  }[]
}

type ChartData = {
  color: string
  softLimitColor: string
  area: BrokerChartData[]
  softLimit: BrokerChartData[]
}

type BrokerChartData = {
  name: string
  x: string
  y: number 
}

type LegendData = {
  name: string
  symbol: {}
}

type KafkaInstanceProps = {
  kafkaID: string
}

export const AvailableDiskSpaceChart: React.FC<KafkaInstanceProps> = ({kafkaID}: KafkaInstanceProps) => {

  const containerRef = useRef();
  const { t } = useTranslation();
  const authContext = useContext(AuthContext);
  const { basePath } = useContext(ApiContext);
  const { addAlert } = useAlerts();
  const [width, setWidth] = useState();
  const [legend, setLegend] = useState()
  const [chartData, setChartData] = useState<ChartData[]>();
  const [metricsDataUnavailable, setMetricsDataUnavailable] = useState(false);
  const [chartDataLoading, setChartDataLoading] = useState(true);
  const [maxValueInDataSets, setMaxValueInDataSets] = useState();

  const [largestByteSize, setLargestByteSize] = useState();
  const colors = [chart_color_blue_300.value, chart_color_orange_300.value, chart_color_green_300.value];
  const softLimitColor = chart_color_black_500.value;

  const handleResize = () => containerRef.current && setWidth(containerRef.current.clientWidth);
  const itemsPerRow = width && width > 650 ? 6 : 3;

  const fetchAvailableDiskSpaceMetrics = async () => {
    const accessToken = await authContext?.getToken();
    if (accessToken !== undefined && accessToken !== '') {
      try {
        const apisService = new DefaultApi({
          accessToken,
          basePath
        });
        if (!kafkaID) {
          return;
        }
        const data = await apisService.getMetricsByRangeQuery(kafkaID, 6 * 60, 5 * 60, ['kubelet_volume_stats_available_bytes']);
        
        console.log('what is Data Available Disk' + JSON.stringify(data));
        
        let brokerArray: Broker[] = [];
        if(data.data.items) {
          setMetricsDataUnavailable(false);
          data.data.items?.forEach((item, i) => {
            const labels = item.metric;
            if (labels === undefined) {
              throw new Error('item.metric cannot be undefined');
            }
            if (item.values === undefined) {
              throw new Error('item.values cannot be undefined');
            }
            if (labels['__name__'] === 'kubelet_volume_stats_available_bytes') {
              const pvcName = labels['persistentvolumeclaim'];

              if (!pvcName.includes('zookeeper')) {
                const broker = {
                  name: `Broker` + (i + 1),
                  data: []
                } as Broker;

                item.values?.forEach(value => {
                  if (value.Timestamp == undefined) {
                    throw new Error('timestamp cannot be undefined');
                  }
                  broker.data.push({
                    name: `Broker` + (i + 1),
                    timestamp: value.Timestamp,
                    bytes: value.Value
                  });
                })
                brokerArray.push(broker);
              }
            }
            
          })
          getChartData(brokerArray);
        }
        else {
          setMetricsDataUnavailable(true);
          setChartDataLoading(false);
        }
      } catch (error) {
      let reason: string | undefined;
      if (isServiceApiError(error)) {
        reason = error.response?.data.reason;
      }
        addAlert(t('something_went_wrong'), AlertVariant.danger, reason);
      }
    }
  };

  useEffect(() => {
    fetchAvailableDiskSpaceMetrics();
    handleResize();
  }, []);

  useTimeout(() => fetchAvailableDiskSpaceMetrics(), 1000 * 60 * 5);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
  }, [width]);

  const getChartData = (brokerArray) => {
    let legendData: Array<LegendData> = [{name: 'Limit', symbol: { fill: chart_color_black_500.value, type: 'threshold'}}];
    let chartData: Array<ChartData> = [];
    let largestByteSize = getLargestByteSize(brokerArray);
    let maxValuesInBrokers: Array<number> = [];
    brokerArray.map((broker, index) => {
      const color = colors[index];
      legendData.push({
        name: broker.name,
        symbol: { fill: color }
      });

      let area: Array<BrokerChartData> = [];
      let softLimit: Array<BrokerChartData> = [];
      maxValuesInBrokers.push(getMaxValueOfArray(broker.data));


      const getCurrentLengthOfData = () => {
        let timestampDiff = broker.data[broker.data.length - 1].timestamp - broker.data[0].timestamp;
        const minutes = timestampDiff / 1000 / 60;
        return minutes;
      }
      let lengthOfData = (6 * 60) - getCurrentLengthOfData();
      let lengthOfDataPer5Mins = ((6 * 60) - getCurrentLengthOfData()) / 5;
    
      if (lengthOfData <= 360) {
        for (var i = 0; i < lengthOfDataPer5Mins; i = i+1) {
          const newTimestamp = (broker.data[0].timestamp - ((lengthOfDataPer5Mins - i) * (5 * 60000)));
          const date = new Date(newTimestamp);
          const time = format(date, 'hh:mm');
          area.push({ name: broker.name, x: time, y: 0})
          softLimit.push({ name: 'Limit', x: time, y: 20 });
        }
      }

      broker.data.map(value => {
        const date = new Date(value.timestamp);
        const time = format(date, 'hh:mm');
        const bytes = convertToSpecifiedByte(value.bytes, largestByteSize);
        area.push({ name: value.name, x: time, y: bytes});
        softLimit.push({ name: 'Limit', x: time, y: 20 });
      });
      chartData.push({ color, softLimitColor, area, softLimit });
    });
    console.log('what is maxValuesInBrokers' + maxValuesInBrokers)
    const maxValueData: number = convertToSpecifiedByte(Math.max(...maxValuesInBrokers), largestByteSize);
    console.log('what is maxValueData' + maxValueData)

    setLegend(legendData);
    setChartData(chartData);
    setLargestByteSize(largestByteSize);
    setChartDataLoading(false);
    setMaxValueInDataSets(maxValueData);
  }

    return (
      <Card>
        <CardTitle component="h2">
          {t('metrics.available_disk_space')}
        </CardTitle>
        <CardBody>
          <div ref={containerRef}>
            { !chartDataLoading ? (
              !metricsDataUnavailable ? (
                chartData && legend && byteSize && maxValueInDataSets &&
                <Chart
                  ariaDesc={t('metrics.available_disk_space')}
                  ariaTitle="Disk Space"
                  containerComponent={
                    <ChartVoronoiContainer
                      labels={({ datum }) => `${datum.name}: ${datum.y}`}
                      constrainToVisibleArea
                    />
                  }
                  legendPosition="bottom-left"
                  legendComponent={
                    <ChartLegend
                      orientation={'horizontal'}
                      data={legend}
                      itemsPerRow={itemsPerRow}
                    />
                  }
                  height={350}
                  padding={{
                    bottom: 110, // Adjusted to accomodate legend
                    left: 90,
                    right: 60,
                    top: 25
                  }}
                  themeColor={ChartThemeColor.multiUnordered}
                  width={width}
                  minDomain={{ y: 0 }}
                  legendAllowWrap={true}
                >
                  <ChartAxis label={'Time'} tickCount={6} />
                  <ChartAxis
                    dependentAxis
                    tickFormat={(t) => `${Math.round(t)} ${largestByteSize}`}
                    tickCount={4}
                    domain={{ y: [0, maxValueInDataSets]}}
                  />
                    <ChartGroup>
                      {chartData && chartData.map((value, index) => (
                        <ChartArea
                          key={`chart-area-${index}`}
                          data={value.area}
                          interpolation="monotoneX"
                          style={{
                            data: {
                              stroke: value.color
                            }
                          }}
                        />
                      ))}
                    </ChartGroup>
                    <ChartThreshold
                      key={`chart-softlimit`}
                      data={chartData && chartData[0].softLimit}
                      style={{
                        data: {
                          stroke: chartData && chartData[0].softLimitColor
                        }
                      }}
                    />
                </Chart>
              ) : (
                <ChartEmptyState
                  title="No data"
                  body="We’re creating your Kafka instance, so some details aren’t yet available."
                  noData
                />
              )
            ) : (
              <Bullseye>
                <Spinner isSVG/>
              </Bullseye>
            )}
          </div>
        </CardBody>
      </Card>
  );
}