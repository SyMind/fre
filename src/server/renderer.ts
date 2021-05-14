import { FreElement } from "../type";
import CurrentDispatcher from "../dispatcher/current"
import {ServerDispatcher, prepareToUseHooks} from '../dispatcher/server';

const isElement = (vnode: FreElement) => typeof vnode.type === 'function'

const resolve = (vnode: any): FreElement => {
    if (!isElement(vnode)) {
        return vnode
    }
    
    prepareToUseHooks(vnode)
    const inst = vnode.type(vnode.props)
    return inst
}

export default class ServerRenderer {
    root: FreElement

    constructor(root: FreElement) {
        this.root = root
    }

    render(vnode: FreElement): string {
        const children = resolve(vnode)
        if (Array.isArray(children)) {
            return children.reduce((str, child) => str += this.render(child), '')
        }
        if (children.type === '') {
            return children.props.nodeValue
        }
        return `<${children.type}>${this.render(children.props.children)}</${children.type}>`
    }

    read(): string {
        CurrentDispatcher.current = new ServerDispatcher()
        return this.render(this.root)
    }
}
