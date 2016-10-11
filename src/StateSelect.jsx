import React from 'react'
import states from './states.json'

class StateSelect extends React.Component {
  constructor (props) {
    super(props)
    this.handleStateUpdate = this.handleStateUpdate.bind(this)
  }

  handleStateUpdate (event) {
    event.preventDefault()
    this.props.getData(event.target.value)
  }

  render () {
    return (
      <select
        onChange={this.handleStateUpdate}
        defaultValue={this.props.curState}
      >
        {Object.keys(states).map((stateName) =>
          <option
            key={states[stateName]}
            value={states[stateName]}>{stateName}</option>)}
      </select>
    )
  }
}

StateSelect.propTypes = {
  curState: React.PropTypes.number,
  getData: React.PropTypes.func
}

export default StateSelect
