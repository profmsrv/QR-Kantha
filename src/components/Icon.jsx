import React from "react";

// Thin wrapper around Material Symbols so icons are decorative by default.
const Icon = ({ name, fill = false, size, className = "", style }) => (
  <span
    aria-hidden="true"
    className={`material-symbols-outlined ${fill ? "icon-fill" : ""} ${className}`}
    style={size ? { fontSize: size, ...style } : style}
  >
    {name}
  </span>
);

export default Icon;
