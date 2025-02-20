/** @jsx h */
import { h } from '../src/index'
import CurrentDispatcher from '../src/dispatcher/current';
import ClientDispatcher from '../src/dispatcher/client';
import { testUpdates } from './test-util'

beforeAll(() => {
  CurrentDispatcher.current = new ClientDispatcher()
})

test('reorder and reuse elements during key-based reconciliation of child-nodes', async () => {
  const states = [
    [1, 2, 3],
    [3, 1, 2], // shift right
    [1, 2, 3],
    [2, 3, 1], // shift left
    [1, 2, 3],
    [1, 3], // remove from middle
    [1, 2, 3],
    [2, 3], // remove first
    [1, 2, 3],
    [1, 2], // remove last
    [1, 2, 3],
    [3, 2, 1], // reverse order
  ]

  let lastChildren

  await testUpdates(
    states.map((state, stateNumber) => ({
      content: (
        <ul>
          {state.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ),
      test: (elements) => {
        const children = [...elements[0].children]
        expect(children.map((el) => el.textContent)).toEqual(state.map((value) => '' + value))

        if (stateNumber > 1) {
          const lastState = states[stateNumber - 1]
          state.forEach((value, index) => {
            const lastIndex = lastState.indexOf(value)
            if (lastIndex !== -1) {
              // console.log(`item ${value} position ${lastIndex} -> ${index}`)
              expect(children[index]).toStrictEqual(lastChildren[lastIndex])
            }
          })
        }

        lastChildren = children
      },
    }))
  )
})
