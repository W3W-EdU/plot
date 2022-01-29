import {create, pointer as pointerof} from "d3";
import {identity, maybeFrameAnchor, maybeTuple} from "../options.js";
import {Mark} from "../plot.js";
import {selection, selectionEquals} from "../selection.js";
import {applyFrameAnchor} from "../style.js";

const defaults = {
  ariaLabel: "pointer"
};

export class Pointer extends Mark {
  constructor(data, {x, y, r = 20, mode = "auto", frameAnchor, ...options} = {}) {
    super(
      data,
      [
        {name: "x", value: x, scale: "x", optional: true},
        {name: "y", value: y, scale: "y", optional: true}
      ],
      options,
      defaults
    );
    this.r = +r;
    this.mode = mode === "auto" ? (x == null ? "y" : y == null ? "x" : "xy") : mode; // TODO maybe mode
    this.frameAnchor = maybeFrameAnchor(frameAnchor);
  }
  render(index, scales, {x: X, y: Y}, dimensions) {
    const {marginLeft, width, marginRight, marginTop, height, marginBottom} = dimensions;
    const {mode, r} = this;
    const [cx, cy] = applyFrameAnchor(this, dimensions);
    const r2 = r * r;
    const g = create("svg:g");
    const C = [];

    g.append("g")
        .attr("fill", "none")
      .selectAll("circle")
      .data(index)
      .join("circle")
        .attr("r", 4)
        .attr("cx", X ? i => X[i] : cx)
        .attr("cy", Y ? i => Y[i] : cy)
        .each(function(i) { C[i] = this; });

    g.append("rect")
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .attr("x", marginLeft)
        .attr("y", marginTop)
        .attr("width", width - marginRight)
        .attr("height", height - marginBottom)
        .on("pointerover pointermove", function(event) {
          const [mx, my] = pointerof(event);
          let S = index;
          switch (mode) {
            case "xy": {
              S = S.filter(i => {
                const dx = X[i] - mx, dy = Y[i] - my;
                return dx * dx + dy * dy <= r2;
              });
              break;
            }
            case "x": {
              const [x0, x1] = [mx - r, mx + r];
              S = S.filter(i => x0 <= X[i] && X[i] <= x1);
              break;
            }
            case "y": {
              const [y0, y1] = [my - r, my + r];
              S = S.filter(i => y0 <= Y[i] && Y[i] <= y1);
              break;
            }
          }
          C.forEach(c => c.setAttribute("stroke", "none"));
          S.forEach(i => C[i].setAttribute("stroke", "black"));
          if (!selectionEquals(node[selection], S)) {
            node[selection] = S;
            node.dispatchEvent(new Event("input", {bubbles: true}));
          }
        })
        .on("pointerout", function() {
          C.forEach(c => c.setAttribute("stroke", "none"));
          node[selection] = null;
          node.dispatchEvent(new Event("input", {bubbles: true}));
        });

    const node = g.node();
    node[selection] = null;
    return node;
  }
}

export function pointer(data, {x, y, ...options} = {}) {
  ([x, y] = maybeTuple(x, y));
  return new Pointer(data, {...options, x, y});
}

export function pointerX(data, {x = identity, ...options} = {}) {
  return new Pointer(data, {...options, mode: "x", x, y: null});
}

export function pointerY(data, {y = identity, ...options} = {}) {
  return new Pointer(data, {...options, mode: "y", x: null, y});
}
