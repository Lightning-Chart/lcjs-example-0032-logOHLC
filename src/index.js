/*
 * LightningChart JS Example that showcases OHLC series with logarithmic Y Axis.
 */
// Import LightningChartJS
const lcjs = require('@lightningchart/lcjs')

// Import xydata
const xydata = require('@lightningchart/xydata')

// Extract required parts from LightningChartJS.
const { lightningChart, OHLCSeriesTypes, AxisTickStrategies, LegendBoxBuilders, Themes } = lcjs

// Import data-generator from 'xydata'-library.
const { createProgressiveTraceGenerator } = xydata

// Initialize chart.
const chart = lightningChart({
            resourcesBaseUrl: new URL(document.head.baseURI).origin + new URL(document.head.baseURI).pathname + 'resources/',
        })
    .ChartXY({
        theme: Themes[new URLSearchParams(window.location.search).get('theme') || 'darkGold'] || undefined,
        // Specify Y Axis as logarithmic.
        defaultAxisY: {
            type: 'logarithmic',
            base: '10',
        },
    })
    .setTitle('OHLC Chart with Logarithmic Y Axis')

// Configure DateTime Axis X.
const dateOrigin = new Date(2013, 8, 16)
const dateOriginTime = dateOrigin.getTime()
const xAxis = chart.getDefaultAxisX().setTickStrategy(AxisTickStrategies.DateTime, (tickStrategy) => tickStrategy.setDateOrigin(dateOrigin))

const yAxis = chart.getDefaultAxisY().setTitle('Stock price (€)')

// Generate progressive XY data.
const y1 = 1000 * (0.5 + Math.random())
const y2 = 10000 * (0.5 + Math.random())
const priceBoomStartX = 3216
const priceBoomEndX = 5796
const flipAtY = (limitY, y) => (y < limitY ? limitY + (limitY - y) : y)
Promise.all([
    createProgressiveTraceGenerator()
        .setNumberOfPoints(15000)
        .generate()
        .toPromise()
        .then((data) => data.map((xy) => ({ x: xy.x, y: Math.max(y1 + xy.y * 6, 1) }))),
    createProgressiveTraceGenerator()
        .setNumberOfPoints(15000)
        .generate()
        .toPromise()
        .then((data) => data.map((xy) => ({ x: xy.x, y: y2 + flipAtY(y2 * 0.75, xy.y * 250) }))),
])
    .then((dataSets) => {
        // Merge two data sets into one by interpolating from data set 1 to data set 2, simulating a "price boom".
        const data = dataSets[0].map((xy, i) => {
            if (i <= priceBoomStartX) return xy
            if (i >= priceBoomEndX) return dataSets[1][i]
            // Linear interpolation.
            const lerpAmount = (i - priceBoomStartX) / (priceBoomEndX - priceBoomStartX)
            return { x: xy.x, y: xy.y + lerpAmount * (dataSets[1][i].y - xy.y) }
        })
        return data
    })
    // Map random generated data to start from a particular date and scale X step from [1] to 1 hour.
    .then((data) =>
        data.map((xy) => ({
            x: dateOriginTime + xy.x * 1000 * 60 * 60,
            y: xy.y,
        })),
    )
    // When data origin is used (required for DateTime axis range smaller than 1 day), time coordinate has to be shifted by date origin.
    .then((data) =>
        data.map((p) => ({
            x: p.x - dateOriginTime,
            y: p.y,
        })),
    )
    .then((data) => {
        // Package XY points into OHLC series automatically.
        const series = chart
            .addOHLCSeries({ seriesConstructor: OHLCSeriesTypes.AutomaticPacking })
            .setName('Stock price')
            .setPackingResolution(1000 * 60 * 60)
            .add(data)

        // Add marker for price boom start.
        xAxis
            .addConstantLine()
            .setName('Price boom start')
            .setValue(priceBoomStartX * 1000 * 60 * 60)
            .setMouseInteractions(false)

        // Fit X Axis immediately.
        xAxis.fit()

        // Add LegendBox.
        const legend = chart
            .addLegendBox(LegendBoxBuilders.VerticalLegendBox)
            // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
            .setAutoDispose({
                type: 'max-width',
                maxWidth: 0.2,
            })
            .add(chart)
    })
