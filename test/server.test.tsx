/** @jsx h */
import { h } from '../src'
import { renderToString } from '../src/server'
import { useState, useReducer, useEffect } from '../src/hook'

test('should generate simple markup', () => {
    const response = renderToString(<span>hello world</span>)
    expect(response).toBe('<span>hello world</span>')
})

test('should render composite components', () => {
    const Child = ({ name }) => (
        <span>
            My name is {name}
        </span>
    )

    const Parent = () => (
        <div>
            <Child name="child" />
        </div>
    )

    const response = renderToString(<Parent />)
    expect(response).toBe('<div><span>My name is child</span></div>')
})

describe('useState', () => {
    test('basic render', () => {
        const Counter = () => {
            const [count] = useState(0)
            return <span>Count: {count}</span>
        }
        const response = renderToString(<Counter />)
        expect(response).toBe('<span>Count: 0</span>')
    })
})

describe('useReducer', () => {
    test('with initial state', () => {
        function reducer(state, action) {
            return action === 'increment' ? state + 1 : state
        }
        function Counter() {
            const [count] = useReducer(reducer, 0)
            return <span>Count: {count}</span>
        }

        const response = renderToString(<Counter />)
        expect(response).toBe('<span>Count: 0</span>')
    })
})

describe('useEffect', () => {
    test('should ignore effects on the server', () => {
        let invoke = 0
        function Counter() {
          useEffect(() => {
            invoke++
          })
          return <span>hello world</span>
        }
  
        renderToString(<Counter count={0} />)
        expect(invoke).toBe(0)
      })
})
