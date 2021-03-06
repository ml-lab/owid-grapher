import * as React from 'react'
import Bounds from './Bounds'
import { observable, computed, action } from 'mobx'
import { observer } from 'mobx-react'
import ChoroplethMap, { ChoroplethData, GeoFeature, MapBracket, MapEntity } from './ChoroplethMap'
import MapLegend, { MapLegendView } from './MapLegend'
import { getRelativeMouse } from './Util'
import Header from './Header'
import SourcesFooter from './SourcesFooter'
import ChartConfig from './ChartConfig'
import MapConfig from './MapConfig'
import { MapLegendBin } from './MapData'
import MapProjection from './MapProjection'
import ChartView from './ChartView'
import Tooltip from './Tooltip'
import NoData from './NoData'
import { select } from 'd3-selection'
import { easeCubic } from 'd3-ease'

interface MapWithLegendProps {
    bounds: Bounds,
    choroplethData: ChoroplethData,
    years: number[],
    inputYear: number,
    legendData: MapLegendBin[],
    legendTitle: string,
    projection: MapProjection,
    defaultFill: string
}

@observer
class MapWithLegend extends React.Component<MapWithLegendProps> {
    @observable focusEntity: any = null
    @observable.ref tooltip: React.ReactNode | null = null
    @observable focusBracket: MapBracket

    context!: { chartView: ChartView, chart: ChartConfig }

    base!: SVGGElement
    @action.bound onMapMouseOver(d: GeoFeature, ev: React.MouseEvent<SVGPathElement>) {
        const datum = d.id === undefined ? undefined : this.props.choroplethData[d.id]
        this.focusEntity = { id: d.id, datum: datum || { value: "No data" } }
        const { chart } = this.context

        const mouse = getRelativeMouse(this.base, ev)
        if (datum) {
            const specifyYear = datum.year !== this.props.inputYear

            this.tooltip = <Tooltip x={mouse.x} y={mouse.y} style={{ textAlign: "center" }}>
                <h3 style={{ padding: "0.3em 0.9em", margin: 0, backgroundColor: "#fcfcfc", borderBottom: "1px solid #ebebeb", fontWeight: "normal", fontSize: "1em" }}>{datum.entity}</h3>
                <p style={{ margin: 0, padding: "0.3em 0.9em", fontSize: "0.8em" }}>
                    <span>{chart.map.data.formatTooltipValue(datum.value)}</span><br />
                    {specifyYear && <div>
                        in<br />
                        <span>{datum.year}</span>
                    </div>}
                </p>
            </Tooltip>
        }
    }

    @action.bound onMapMouseLeave() {
        this.focusEntity = null
        this.tooltip = null
    }

    @action.bound onClick(d: GeoFeature) {
        const { chartView, chart } = this.context

        if (chartView.isMobile || !chart.hasChartTab) return
        const datum = this.props.choroplethData[d.id as string]

        if (datum) {
            chart.tab = 'chart'
            chart.data.selectedKeys = chart.data.availableKeysByEntity.get(datum.entity) || []
        }
    }

    componentWillUnmount() {
        this.onMapMouseLeave()
        this.onLegendMouseLeave()
    }

    @action.bound onLegendMouseOver(d: MapEntity) {
        this.focusBracket = d
    }

    @action.bound onTargetChange({ targetStartYear }: { targetStartYear: number }) {
        this.context.chart.map.targetYear = targetStartYear
    }

    @action.bound onLegendMouseLeave() {
        this.focusBracket = null
    }

    @computed get hasTimeline(): boolean {
        return !this.context.chart.map.props.hideTimeline && this.props.years.length > 1 && !this.context.chartView.isExport
    }

    @computed get mapLegend(): MapLegend {
        const that = this
        return new MapLegend({
            get bounds() { return that.props.bounds.padBottom(15) },
            get legendData() { return that.props.legendData },
            get equalSizeBins() { return that.context.chart.map.props.equalSizeBins },
            get title() { return that.props.legendTitle },
            get focusBracket() { return that.focusBracket },
            get focusEntity() { return that.focusEntity },
            get fontSize() { return that.context.chart.baseFontSize }
        })
    }

    componentDidMount() {
        select(this.base).selectAll("path")
            .attr("data-fill", function() { return (this as SVGPathElement).getAttribute("fill") })
            .attr("fill", this.context.chart.map.noDataColor)
            .transition()
            .duration(500)
            .ease(easeCubic)
            .attr("fill", function() { return (this as SVGPathElement).getAttribute("data-fill") })
            .attr("data-fill", function() { return (this as SVGPathElement).getAttribute("fill") })
    }

    render() {
        const { choroplethData, projection, defaultFill } = this.props
        const { bounds, years, inputYear } = this.props
        const { focusBracket, focusEntity, mapLegend, tooltip } = this
        return <g className="mapTab">
            {/*<rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height-timelineHeight} fill="#ecf6fc"/>*/}
            <ChoroplethMap bounds={bounds.padBottom(mapLegend.height + 15)} choroplethData={choroplethData} projection={projection} defaultFill={defaultFill} onHover={this.onMapMouseOver} onHoverStop={this.onMapMouseLeave} onClick={this.onClick} focusBracket={focusBracket} focusEntity={focusEntity} />
            <MapLegendView legend={mapLegend} onMouseOver={this.onLegendMouseOver} onMouseLeave={this.onLegendMouseLeave} />
            {/*<Timeline bounds={this.props.bounds} fontSize={this.context.chart.baseFontSize} onTargetChange={this.onTargetChange} years={years} startYear={inputYear} endYear={inputYear} singleYearMode={true}/>*/}
            {tooltip}
        </g>
    }
}

interface MapTabProps {
    chart: ChartConfig,
    bounds: Bounds
}

@observer
export default class MapTab extends React.Component<MapTabProps> {
    @computed get map(): MapConfig { return (this.props.chart.map as MapConfig) }

    @computed get header() {
        const that = this
        return new Header({
            get chart() { return that.props.chart },
            get maxWidth() { return that.props.bounds.width }
        })
    }

    @computed get footer() {
        const that = this
        return new SourcesFooter({
            get chart() { return that.props.chart },
            get maxWidth() { return that.props.bounds.width }
        })
    }

    render() {
        const { map } = this
        if (!map.data.isReady)
            return <NoData bounds={this.props.bounds} />

        const { bounds } = this.props
        const { header, footer } = this

        return <g className="mapTab">
            {header.render(bounds.x, bounds.y)}
            <MapWithLegend
                bounds={bounds.padTop(header.height + 5).padBottom(footer.height)}
                choroplethData={map.data.choroplethData}
                years={map.data.timelineYears}
                inputYear={map.data.targetYear}
                legendData={map.data.legendData}
                legendTitle={map.data.legendTitle}
                projection={map.projection}
                defaultFill={map.noDataColor}
            />
            {footer.render(bounds.x, bounds.bottom - footer.height)}
        </g>

    }
}
