import React from 'react'
import ReactDOM from 'react-dom'
import fetch from 'isomorphic-fetch'
import {
  VictoryArea,
  VictoryAxis,
  VictoryChart,
  VictoryContainer,
  VictoryGroup,
  VictoryLine,
  VictoryScatter,
  VictoryTooltip
} from 'victory'

class Main extends React.Component {
  constructor (props) {
    super(props)
    this.calcSlope = this.calcSlope.bind(this)
    this.toggleCelcius = this.toggleCelcius.bind(this)
    this.state = {
      data: [],
      useFarenheight: true,
      displayTrend: false,
      desc: {}
    }
  }
  componentDidMount () {
    fetch('http://www.ncdc.noaa.gov/cag/time-series/us/37/USW00014765/tavg/ytd/12/1895-2016.json?base_prd=true&begbaseyear=1948&endbaseyear=2015')
      .then((resp) => resp.json())
      .then((body) => {
        const yearMonths = Object.keys(body.data)
        this.setState({ data: yearMonths.map((yearMonth) => {
          const temp = !this.state.useFarenheight
            ? (body.data[yearMonth].value - 32) * (5 / 9)
            : body.data[yearMonth].value
          return {
            temp,
            year: yearMonth.substring(0, 4),
            label: `${yearMonth.substring(0, 4)}: ${Math.floor(temp)}°${this.state.useFarenheight ? 'F' : 'C'}`
          }
        })})
        this.setState({ desc: body.description })
      })
  }

  calcSlope (data) {
    const numPoints = this.state.data.length
    const xVals = data.map((dataPoint, idx) => idx)
    const yVals = data.map((dataPoint) => dataPoint.temp)
    const a = data.length * (
      data
        .reduce((prev, cur, idx) => prev + (idx * cur.temp), 0)
    )
    const b = xVals.reduce((prev, cur) => prev + cur, 0) * yVals.reduce((prev, cur) => prev + cur, 0)
    const c = data.length * (xVals.reduce((prev, cur) => prev + (cur * cur), 0))
    const d = Math.pow(xVals.reduce((prev, cur) => prev + cur, 0), 2)
    const slope = (a - b) / (c - d)
    return slope
  }

  calcYInt (data) {
    const yVals = data.map((dataPoint) => dataPoint.temp)
    const sum = yVals.reduce((prev, cur) => prev + cur)
    const f = this.calcSlope(data) * yVals.reduce((prev, cur) => prev + cur, 0)
    return (sum - f) / data.length
  }

  setDomain (data = [], forY = true) {
    return [].concat(forY
      ? [
        data
          .map((dataPoint) => dataPoint.temp)
          .reduce((prev, cur) => prev < cur ? prev : cur),
        data
          .map((dataPoint) => dataPoint.temp)
          .reduce((prev, cur) => prev > cur ? prev : cur)
      ]
      : [
        data
          .map((dataPoint) => dataPoint.year)
          .reduce((prev, cur) => prev < cur ? prev : cur),
        data
          .map((dataPoint) => dataPoint.year)
          .reduce((prev, cur) => prev > cur ? prev : cur)
      ]
    )
  }

  toggleCelcius () {
    this.setState({ useFarenheight: !this.state.useFarenheight })
    this.setState({ data: this.state.data.map((dataPoint) => {
      return Object.assign({},
        dataPoint,
        { temp: !this.state.useFarenheight
          ? (dataPoint.temp - 32) * (5 / 9)
          : dataPoint.temp + 32 * (9 / 5) }
      )
    })})
  }

  render () {
    return (
      <div>
        <linearGradient id="gradient">
          <stop offset="0%" stopColor="red"/>
          <stop offset="50%" stopColor="blue"/>
        </linearGradient>
        <form action="">
          <label>Use Celcius</label>
          <input
            type="checkbox"
            checked={!this.state.useFarenheight}
            onChange={this.toggleCelcius}/>
          <label>Display Trend</label>
          <input
            type="checkbox"
            checked={this.state.displayTrend}
            onChange={() => this.setState({ displayTrend: !this.state.displayTrend })}/>
        </form>
        {!this.state.data.length
          ? 'Loading...'
          : <div>
          <h1>{`${this.state.desc.title}, ${this.state.desc.base_period}`}</h1>
          <VictoryChart containerComponent={<VictoryContainer title="Chart of Dog Breeds" desc="This chart shows how popular each dog breed is by percentage in Seattle." />}>
            <VictoryAxis
              fixLabelOverlap
            />
            <VictoryAxis
              dependentAxis
              fixLabelOverlap
              domain={[
                this.state.data
                  .map((dataPoint) => dataPoint.temp)
                  .reduce((prev, cur) => prev < cur ? prev : cur, 0),
                this.state.data
                  .map((dataPoint) => dataPoint.temp)
                  .reduce((prev, cur) => prev > cur ? prev : cur, 0)
              ]}
            />
            <VictoryGroup
              dataComponent
              data={this.state.data}
              x={'year'}
              y={'temp'}
              style={{
                data: {opacity: 0.7}
              }}
              scale={{x: 'time', y: 'linear'}}
              domain={{
                y: this.setDomain(this.state.data)
              }}
            >
              <VictoryArea
                style={{
                  data: {
                    fill: 'tomato',
                    stroke: 'red'
                  }
                }}
              />
              <VictoryScatter
                labelComponent={<VictoryTooltip />}
                size={2}
                style={{
                  data: {
                    fill: 'tomato',
                  }
                }}
              />
            </VictoryGroup>
          </VictoryChart>
          </div>
        }
      </div>
    )
  }
}

const app = document.getElementById('app')
ReactDOM.render(<Main />, app)

if (module.hot) {
  module.hot.accept()
}
