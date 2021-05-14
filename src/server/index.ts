import { FreElement } from "../type";
import Renderer from './renderer'

export const renderToString = (root: FreElement): string => {
    const renderer = new Renderer(root)
    return renderer.read()
}
