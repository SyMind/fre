import {
  IFiber,
  FreElement,
  FC,
  Attributes,
  HTMLElementEx,
  FreNode,
  IRef,
  IEffect,
} from "./type"
import { createElement, updateElement } from "./dom"
import { resetCursor } from "./hooks"
import { scheduleWork, shouldYield, schedule, getTime } from "./scheduler"
import { isArr, createText } from "./h"

let currentFiber: IFiber
let commitment = null
let commits = []
let deletions = []

export const enum OP {
  UPDATE = 1 << 1,
  INSERT = 1 << 2,
  REMOVE = 1 << 3,
  FRAGMENT = 1 << 4,
  SIBLING = 1 << 5,
  SVG = 1 << 6,
  DIRTY = 1 << 7,
  MOUNT = UPDATE | INSERT,
}
export const render = (
  vnode: FreElement,
  node: Node,
  done?: () => void
): void => {
  const rootFiber = {
    node,
    props: { children: vnode },
    done,
  } as IFiber
  dispatchUpdate(rootFiber)
}

export const dispatchUpdate = (fiber?: IFiber) => {
  if (fiber && !(fiber.tag & OP.DIRTY)) {
    fiber.tag = OP.UPDATE | OP.DIRTY
    commitment = fiber
    scheduleWork(reconcileWork.bind(null, fiber), fiber.time)
  }
}

const reconcileWork = (WIP?: IFiber): boolean => {
  while (WIP && !shouldYield()) WIP = reconcile(WIP)
  if (WIP) return reconcileWork.bind(null, WIP)
  if (commitment.last) commitWork(commitment.last)
  return null
}

const reconcile = (WIP: IFiber): IFiber | undefined => {
  isFn(WIP.type) ? updateHook(WIP) : updateHost(WIP)
  commits.push(WIP)
  if (WIP.child) return WIP.child
  while (WIP) {
    if (!commitment.last && WIP.tag & OP.DIRTY) {
      commitment.last = WIP
      WIP.tag &= ~OP.DIRTY
      return null
    }
    if (WIP.sibling) return WIP.sibling
    WIP = WIP.parent
  }
}

const updateHook = <P = Attributes>(WIP: IFiber): void => {
  if (WIP.lastProps === WIP.props) return
  currentFiber = WIP
  resetCursor()
  let start = getTime()
  let children = (WIP.type as FC<P>)(WIP.props)
  WIP.time = getTime() - start
  if (isStr(children)) children = createText(children as string)
  if (isArr(children)) WIP.tag |= OP.FRAGMENT
  reconcileChildren(WIP, children)
}

const getParentNode = (WIP: IFiber): HTMLElement | undefined => {
  while ((WIP = WIP.parent)) {
    if (!isFn(WIP.type)) return WIP.node
  }
}

const updateHost = (WIP: IFiber): void => {
  WIP.parentNode = getParentNode(WIP) as any
  if (!WIP.node) {
    if (WIP.type === "svg") WIP.tag |= OP.SVG
    WIP.node = createElement(WIP) as HTMLElementEx
  }
  const p = WIP.parent || ({} as any)
  WIP.insertPoint = p.last || null
  p.last = WIP
  WIP.last = null
  reconcileChildren(WIP, WIP.props.children)
}

const reconcileChildren = (WIP: any, children: FreNode): void => {
  let aCh = WIP.kids || [],
    bCh = (WIP.kids = arrayfy(children) as any),
    aHead = 0,
    bHead = 0,
    aTail = aCh.length - 1,
    bTail = bCh.length - 1,
    prev = null,
    map = null

  if (!map) {
    map = {}
    while (aHead <= aTail) {
      const key = aCh[aHead].key
      key && (map[key] = aHead)
      aHead++
    }
  }

  while (bHead <= bTail) {
    let c = bCh[bHead]
    let a = aCh[bHead]
    if (a?.type === c.type) {
      clone(c, a)
      c.tag = OP.UPDATE
      const id = map[c.key]
      if (id != null) {
        c.tag = OP.INSERT
        delete map[c.key]
      }
    } else {
      c.tag = OP.INSERT
      c.node = null
    }
    c.parent = WIP
    if (prev) {
      prev.sibling = c
    } else {
      WIP.child = c
    }
    prev = c
    bHead++
  }

  for (const k in map) {
    const a = aCh[map[k]]
    a.tag = OP.REMOVE
    deletions.push(a)
  }
}

function clone(a, b) {
  a.lastProps = b.props
  a.node = b.node
  a.kids = b.kids
  a.hooks = b.hooks
  a.ref = b.ref
  a.parentNode = b.parentNode
}

const commitWork = (commitment: IFiber): void => {
  commits.forEach(commit)
  deletions.forEach(commit)
  commits = []
  deletions = []
  commitment.done?.()
}

const commit = (fiber: IFiber): void => {
  let { type, tag, parentNode, node, ref, hooks } = fiber
  if (tag & OP.REMOVE) {
    while (isFn(fiber.type)) fiber = fiber.child
    kidsRefer(fiber.kids)
    hooks && hooks.list.forEach(cleanup)
    parentNode.removeChild(fiber.node)
  } else if (isFn(type)) {
    if (hooks) {
      side(hooks.layout)
      schedule(() => side(hooks.effect))
    }
    return
  } else if (tag & OP.UPDATE) {
    updateElement(node, fiber.lastProps || {}, fiber.props)
  } else if (tag & OP.INSERT) {
    const point = fiber.insertPoint ? fiber.insertPoint.node : null
    const after = point ? point.nextSibling : parentNode.firstChild
    if (after === node) return
    if (after === null && node === parentNode.lastChild) return
    parentNode.insertBefore(node, after)
  }
  refer(ref, node)
}

const arrayfy = (arr) => (!arr ? [] : isArr(arr) ? arr : [arr])

const refer = (ref: IRef, dom?: HTMLElement): void => {
  if (ref)
    isFn(ref) ? ref(dom) : ((ref as { current?: HTMLElement })!.current = dom)
}

const kidsRefer = (kids: any): void => {
  kids.forEach((kid) => {
    kid.kids && kidsRefer(kid.kids)
    refer(kid.ref, null)
  })
}

const side = (effects: IEffect[]): void => {
  effects.forEach(cleanup)
  effects.forEach(effect)
  effects.length = 0
}

export const getCurrentFiber = () => currentFiber || null

const effect = (e: IEffect): void => (e[2] = e[0]())
const cleanup = (e: IEffect): void => e[2] && e[2]()
export const isFn = (x: any): x is Function => typeof x === "function"
export const isStr = (s: any): s is number | string =>
  typeof s === "number" || typeof s === "string"
export const some = (v: any) => v != null && v !== false && v !== true
