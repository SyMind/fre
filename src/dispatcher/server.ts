import {
  DependencyList,
  Reducer,
  IFiber,
  Dispatch,
  SetStateAction,
  EffectCallback,
  HookTypes,
  IEffect,
} from "../type"

const isFn = (x: any): x is Function => typeof x === "function"

let workingInProgress = null

export const prepareToUseHooks = (vnode: any): void => {
    workingInProgress = vnode
}

export class ServerDispatcher {
    cursor = 0

    resetCursor() {
        this.cursor = 0
    }

    getHook<S = Function | undefined, Dependency = any>(cursor: number): [[S, Dependency], IFiber] {
        const current: IFiber<any> = workingInProgress
        const hooks = current.hooks || (current.hooks = { list: [], effect: [], layout: [] })
        if (cursor >= hooks.list.length) {
            hooks.list.push([] as IEffect)
        }
        return [(hooks.list[cursor] as unknown) as [S, Dependency], current]
    }

    isChanged(a: DependencyList, b: DependencyList): boolean {
        return !a || a.length !== b.length || b.some((arg, index) => arg !== a[index])
    }

    useReducer<S, A>(reducer?: Reducer<S, A>, initState?: S): [S, Dispatch<A>] {
        const [hook, current]: [any, IFiber] = this.getHook<S>(this.cursor++)
        return [
            hook.length === 0 ? (hook[0] = initState) : hook[0],
            (value: A | Dispatch<A>) => {
                hook[0] = reducer
                    ? reducer(hook[0], value as any)
                    : isFn(value)
                        ? value(hook[0])
                        : value
            },
        ]
    }

    useState<T>(initState: T): [T, Dispatch<SetStateAction<T>>] {
        return this.useReducer(null, initState)
    }

    effectImpl(cb: EffectCallback, deps: DependencyList, key: HookTypes): void {}

    useMemo<S = Function>(cb: () => S, deps?: DependencyList): S {
        const hook = this.getHook<S>(this.cursor++)[0]
        if (this.isChanged(hook[1], deps!)) {
            hook[1] = deps
            return (hook[0] = cb())
        }
        return hook[0]
    }
}
