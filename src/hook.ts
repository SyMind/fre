import {
  DependencyList,
  Reducer,
  Dispatch,
  SetStateAction,
  EffectCallback,
  RefObject
} from "./type"
import CurrentDispatcher from './dispatcher/current'

export const resetCursor = (): void => {
  CurrentDispatcher.current.resetCursor()
}

export const useState = <T>(initState: T): [T, Dispatch<SetStateAction<T>>] => {
  return CurrentDispatcher.current.useReducer(null, initState)
}

export const useReducer = <S, A>(
  reducer?: Reducer<S, A>,
  initState?: S
): [S, Dispatch<A>] => {
  return CurrentDispatcher.current.useReducer(reducer, initState);
}

export const useEffect = (cb: EffectCallback, deps?: DependencyList): void => {
  return CurrentDispatcher.current.effectImpl(cb, deps!, "effect")
}

export const useLayout = (cb: EffectCallback, deps?: DependencyList): void => {
  return CurrentDispatcher.current.effectImpl(cb, deps!, "layout")
}

export const useMemo = <S = Function>(
  cb: () => S,
  deps?: DependencyList
): S => {
  return CurrentDispatcher.current.useMemo(cb, deps)
}

export const useCallback = <T extends (...args: any[]) => void>(
  cb: T,
  deps?: DependencyList
): T => {
  return useMemo(() => cb, deps)
}

export const useRef = <T>(current: T): RefObject<T> => {
  return useMemo(() => ({ current }), [])
}
