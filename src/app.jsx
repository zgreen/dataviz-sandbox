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

import StateSelect from './StateSelect'

class Main extends React.Component {
  constructor (props) {
    super(props)
    this.calcSlope = this.calcSlope.bind(this)
    this.clearSavedData = this.clearSavedData.bind(this)
    this.formulateLabel = this.formulateLabel.bind(this)
    this.getData = this.getData.bind(this)
    this.toggleCelcius = this.toggleCelcius.bind(this)
    this.toggleAvgByDecade = this.toggleAvgByDecade.bind(this)
    this.state = {
      curState: 37,
      data: [],
      useFarenheight: true,
      displayTrend: false,
      desc: {},
      displayAvgByDecade: false,
      gettingNewData: false
    }
  }

  componentDidMount () {
    this.getData(this.state.curState)
  }

  calcSlope (data) {
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

  clearSavedData () {
    window.localStorage.clear()
  }

  formulateLabel (year, yearMonth, temp) {
    const strYear = year ? year : yearMonth
    return `${strYear.substring(0, 4)}: ${temp}°${this.state.useFarenheight ? 'F' : 'C'}`
  }

  getData (stateCode) {
    this.setState({ curState: stateCode })
    const savedState = window.localStorage.getItem(`state${stateCode}`)
    if (savedState) {
      this.updateFromData(JSON.parse(savedState))
    } else {
      this.setState({ gettingNewData: true })
      fetch(`http://www.ncdc.noaa.gov/cag/time-series/us/${stateCode}/00/tavg/ytd/12/1895-2016.json?base_prd=true&begbaseyear=1895&endbaseyear=2016`)
        .then((resp) => resp.json())
        .then((body) => {
          this.setState({ gettingNewData: false })
          this.updateFromData(body)
          window.localStorage.setItem(`state${stateCode}`, JSON.stringify(body))
        })
    }
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
      const temp = !this.state.useFarenheight
        ? (dataPoint.temp * (9 / 5) + 32)
        : (dataPoint.temp - 32) * (5 / 9)
      return {
        temp,
        label: this.formulateLabel(dataPoint.year, null, temp),
        year: dataPoint.year
      }
    })})
  }

  toggleAvgByDecade () {
    this.setState({ displayAvgByDecade: !this.state.displayAvgByDecade },
      () => {
        if (this.state.displayAvgByDecade) {
          const result = this.state.data
            .filter((dataPoint, idx) => {
              return idx === 0 || dataPoint.year % 10 === 0
            })
            .map((decade) => parseInt(decade.year, 10))
            .map((decade, idx) => {
              const remainingYears = decade % 10 !== 0
                ? (decade % 10) - 1
                : 9
              return this.state.data
                .slice(idx, idx + remainingYears)
                .reduce((prev, cur, _idx, arr) => {
                  const temp = (_idx + 1) === arr.length
                    ? (prev.temp + cur.temp) / arr.length
                    : (prev.temp + cur.temp)
                  return {
                    year: decade.toString(),
                    temp,
                    label: `${decade}-${decade + remainingYears}: ${temp}`
                  }
                }, { temp: 0 })
            })
          this.setState({ data: result })
        } else {
          this.getData(this.state.curState)
        }
      })
  }

  updateFromData (data) {
    const yearMonths = Object.keys(data.data)
    this.setState({ data: yearMonths.map((yearMonth) => {
      const temp = !this.state.useFarenheight
        ? (data.data[yearMonth].value - 32) * (5 / 9)
        : data.data[yearMonth].value
      return {
        temp: parseInt(temp, 10),
        year: yearMonth.substring(0, 4),
        label: `${yearMonth.substring(0, 4)}: ${temp}°${this.state.useFarenheight ? 'F' : 'C'}`
      }
    })})
    this.setState({ desc: data.description })
  }

  render () {
    return (
      <div>
        <svg style={{height: '0', width: '0'}}>
          <defs>
            <linearGradient id='gradient' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='50%' stopColor='#FF4136' />
              <stop offset='100%' stopColor='#0074D9' />
            </linearGradient>
          </defs>
        </svg>
        <form action=''>
          <label>Use Celcius</label>
          <input
            type='checkbox'
            checked={!this.state.useFarenheight}
            onChange={this.toggleCelcius}
          />
          <label>Display Trend</label>
          <input
            type='checkbox'
            checked={this.state.displayTrend}
            onChange={() => this.setState({ displayTrend: !this.state.displayTrend })}
          />
          <label>Display Average By Decade</label>
          <input
            type='checkbox'
            onChange={this.toggleAvgByDecade}
          />
        </form>
        <StateSelect
          curState={this.state.curState}
          getData={this.getData}
        />
        <button onClick={this.clearSavedData}>Clear saved data</button>
        {!this.state.data.length || this.state.gettingNewData
          ? 'Loading...'
          : <div>
            <h1>{`${this.state.desc.title}, ${this.state.desc.base_period}`}</h1>
            <VictoryChart containerComponent={<VictoryContainer title='Chart of Dog Breeds' desc='This chart shows how popular each dog breed is by percentage in Seattle.' />}>
              <VictoryAxis
                fixLabelOverlap
              />
              <VictoryAxis
                dependentAxis
                fixLabelOverlap
              />

              <VictoryLine
                data={[
                  {x: this.state.data[0].year, y: (this.calcSlope(this.state.data) * 0) + this.calcYInt(this.state.data)},
                  {x: this.state.data[this.state.data.length - 1].year, y: (this.calcSlope(this.state.data) * (this.state.data.length - 1)) + this.calcYInt(this.state.data)}
                ]}
                style={{
                  data: {opacity: this.state.displayTrend ? 1 : 0}
                }}
              />

              <VictoryGroup
                data={this.state.data}
                x={'year'}
                y={'temp'}
                style={{
                  data: {opacity: 0.7}
                }}
                scale={{x: 'time', y: 'linear'}}
                domain={{y: [
                  this.state.data.reduce((prev, cur) => prev.temp < cur.temp ? prev : cur).temp,
                  this.state.data.reduce((prev, cur) => prev.temp > cur.temp ? prev : cur, { temp: 0 }).temp
                ]}}
              >
                <VictoryArea
                  style={{
                    data: {
                      fill: 'url(#gradient)',
                      stroke: 'red'
                    }
                  }}
                />
                <VictoryScatter
                  labelComponent={<VictoryTooltip />}
                  size={2}
                  style={{
                    data: {
                      fill: 'tomato'
                    }
                  }}
                />
              </VictoryGroup>
            </VictoryChart>
            <small>
              <p>Disclaimer: this project is a work-in-progress, and exists primarily so that I can teach myself Victory.js. The way the data is presented may not be accurate.</p>
              <p>Everything is sourced from:</p>
              <p>NOAA National Centers for Environmental information, Climate at a Glance: U.S. Time Series, published October 2016, retrieved on October 11, 2016 from http://www.ncdc.noaa.gov/cag/</p>
            </small>
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
