import { Component } from 'react'


export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown error' }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <p className="error-title">Something went wrong</p>

          <p className="error-message">
            {this.state.message}
          </p>

          <button
            onClick={this.handleReset}
            className="error-btn"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}