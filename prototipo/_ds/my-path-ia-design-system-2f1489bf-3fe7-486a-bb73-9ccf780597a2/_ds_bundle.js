/* @ds-bundle: {"format":3,"namespace":"MYPATHIADesignSystem_2f1489","components":[{"name":"Divider","sourcePath":"components/brand/Divider.jsx"},{"name":"Logo","sourcePath":"components/brand/Logo.jsx"},{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"Card","sourcePath":"components/cards/Card.jsx"},{"name":"StatCard","sourcePath":"components/cards/StatCard.jsx"},{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"EcosystemTag","sourcePath":"components/feedback/EcosystemTag.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"}],"sourceHashes":{"components/brand/Divider.jsx":"6fa005560e74","components/brand/Logo.jsx":"cff5c8bee44f","components/buttons/Button.jsx":"ee33f29a9ab4","components/cards/Card.jsx":"9246a61923a3","components/cards/StatCard.jsx":"13c6d6f7dad4","components/data/Table.jsx":"b1c7bd71c908","components/feedback/Badge.jsx":"b7f9662a6717","components/feedback/EcosystemTag.jsx":"27faf5c52d3f","components/feedback/ProgressBar.jsx":"febbe2429854","components/forms/Checkbox.jsx":"b1248531a584","components/forms/Input.jsx":"a55fad87b3d7","components/forms/Radio.jsx":"c985ba268a20","components/forms/Select.jsx":"9e2e332b6fce","ui_kits/dashboard/app.jsx":"63c85950a60d","ui_kits/marketing/sections.jsx":"5218862217d2"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MYPATHIADesignSystem_2f1489 = window.MYPATHIADesignSystem_2f1489 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA gradient divider / accent line.
 * short: 56px signature accent below headlines. full: 100% section break.
 * Also supports a subtle 1px rule (variant="rule").
 */
function Divider({
  variant = 'accent',
  width,
  tone = 'light',
  style,
  ...rest
}) {
  if (variant === 'rule') {
    return /*#__PURE__*/React.createElement("hr", _extends({
      className: "mp-divider mp-divider--rule",
      style: {
        border: 'none',
        height: '1px',
        width: width || '100%',
        background: tone === 'dark' ? 'var(--dark-divider)' : 'var(--border)',
        margin: 0,
        ...style
      }
    }, rest));
  }
  const isFull = variant === 'full';
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `mp-divider mp-divider--${variant}`,
    "aria-hidden": "true",
    style: {
      display: 'block',
      height: isFull ? '2px' : '3px',
      width: width || (isFull ? '100%' : '56px'),
      borderRadius: '2px',
      background: 'var(--gradient)',
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Divider.jsx", error: String((e && e.message) || e) }); }

// components/brand/Logo.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA logotype. Syncopate Bold wordmark + "Build your tomorrow." tagline.
 * Tone: light (gradient on white/ice), dark (white on navy), mono (navy print).
 * The tagline always accompanies the logo — never one without the other.
 */
function Logo({
  tone = 'light',
  mark = true,
  size = 'md',
  style,
  ...rest
}) {
  const scale = {
    sm: 0.72,
    md: 1,
    lg: 1.4
  }[size] || 1;
  const wordSize = 22 * scale;
  const markSize = 34 * scale;
  const gradientText = {
    background: 'var(--gradient)',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent'
  };
  const wordColor = tone === 'dark' ? {
    color: 'var(--white)'
  } : tone === 'mono' ? {
    color: 'var(--navy)'
  } : gradientText;
  const taglineColor = tone === 'dark' ? 'var(--on-dark-40)' : tone === 'mono' ? 'var(--navy)' : 'var(--mid-gray)';
  const markBg = tone === 'dark' ? 'var(--navy)' : tone === 'mono' ? 'var(--navy)' : 'var(--gradient)';
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "mp-logo",
    role: "img",
    "aria-label": "MY PATH.IA \u2014 Build your tomorrow.",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: `${14 * scale}px`,
      ...style
    }
  }, rest), mark && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: `${markSize}px`,
      height: `${markSize}px`,
      flexShrink: 0,
      borderRadius: `${12 * scale}px`,
      background: markBg,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: `${markSize * 0.5}px`,
      color: 'var(--white)'
    }
  }, "M"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      flexDirection: 'column',
      gap: `${4 * scale}px`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: `${wordSize}px`,
      lineHeight: 1,
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
      ...wordColor
    }
  }, "MY\xA0PATH.IA"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 300,
      fontSize: `${11 * scale}px`,
      lineHeight: 1,
      letterSpacing: '0.5px',
      color: taglineColor
    }
  }, "Build your tomorrow.")));
}
Object.assign(__ds_scope, { Logo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Logo.jsx", error: String((e && e.message) || e) }); }

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Button.
 * Variants: primary (gradient), secondary (navy outline), ghost (on dark),
 * text (link), pill (tag/filter). One primary CTA per view.
 */
function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  as = 'button',
  children,
  style,
  ...rest
}) {
  const base = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--fw-medium)',
    fontSize: 'var(--fs-button)',
    letterSpacing: 'var(--tr-button)',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-sm)',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    transition: 'opacity var(--dur-fast) var(--ease-default), transform var(--dur-fast) var(--ease-default), background var(--dur-fast) var(--ease-default), color var(--dur-fast) var(--ease-default), border-color var(--dur-fast) var(--ease-default)',
    opacity: disabled ? 0.35 : 1
  };
  const sizes = {
    sm: {
      padding: '8px 18px',
      fontSize: '13px'
    },
    md: {
      padding: '12px 28px'
    },
    lg: {
      padding: '15px 34px',
      fontSize: '15px'
    }
  };
  const variants = {
    primary: {
      background: 'var(--gradient)',
      color: 'var(--white)'
    },
    secondary: {
      background: 'transparent',
      border: '1.5px solid var(--navy)',
      color: 'var(--navy)',
      padding: size === 'md' ? '11px 28px' : undefined
    },
    ghost: {
      background: 'transparent',
      border: '1px solid var(--on-dark-25)',
      color: 'var(--white)',
      fontWeight: 'var(--fw-regular)'
    },
    text: {
      background: 'transparent',
      border: 'none',
      color: 'var(--grad-2)',
      padding: '0',
      borderRadius: 0,
      letterSpacing: 0
    },
    pill: {
      background: 'var(--gradient)',
      color: 'var(--white)',
      borderRadius: 'var(--radius-full)',
      padding: '4px 14px',
      fontSize: '11px'
    }
  };
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: `mp-btn mp-btn--${variant}`,
    disabled: as === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined,
    style: {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/cards/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Card. Surface container.
 * Variants: standard (white), ice (secondary surface), dark (on navy),
 * feature (hero-level, 3px gradient top border).
 */
function Card({
  variant = 'standard',
  accent = false,
  children,
  style,
  ...rest
}) {
  const base = {
    borderRadius: 'var(--radius-lg)',
    padding: '28px',
    position: 'relative',
    transition: 'transform var(--dur-default) var(--ease-default), border-color var(--dur-default) var(--ease-default)'
  };
  const variants = {
    standard: {
      background: 'var(--white)',
      border: '1px solid var(--border)'
    },
    ice: {
      background: 'var(--ice-blue)',
      border: '1px solid var(--border-ice)',
      padding: '24px'
    },
    dark: {
      background: 'var(--dark-surface)',
      border: '1px solid var(--dark-border)',
      color: 'var(--white)'
    },
    feature: {
      background: 'var(--white)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '36px'
    }
  };
  const showTopAccent = accent || variant === 'feature';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `mp-card mp-card--${variant}`,
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), showTopAccent && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: variant === 'feature' ? '3px' : '2px',
      background: 'var(--gradient)',
      borderTopLeftRadius: 'inherit',
      borderTopRightRadius: 'inherit'
    }
  }), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/Card.jsx", error: String((e && e.message) || e) }); }

// components/cards/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Stat Card. Big number + tracked mono label.
 * Number in gradient text (default) or solid navy.
 */
function StatCard({
  value,
  label,
  surface = 'ice',
  gradient = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "mp-statcard",
    style: {
      background: surface === 'ice' ? 'var(--ice-blue)' : 'var(--white)',
      border: surface === 'white' ? '1px solid var(--border)' : '1px solid var(--border-ice)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 'var(--fw-bold)',
      fontSize: '42px',
      lineHeight: 1,
      letterSpacing: '-0.5px',
      ...(gradient ? {
        background: 'var(--gradient)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent'
      } : {
        color: 'var(--navy)'
      })
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-md)',
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      color: 'var(--mid-gray)'
    }
  }, label));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/Table.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA data Table. Navy header, alternating ice rows.
 * columns: [{ key, label, align }]. rows: array of objects keyed by column.key.
 */
function Table({
  columns = [],
  rows = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", _extends({
    className: "mp-table",
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-body)'
    }
  }, rest), /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: 'var(--navy)'
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("th", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: '14px 20px',
      fontFamily: 'var(--font-heading)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: '12px',
      color: 'var(--white)',
      whiteSpace: 'nowrap'
    }
  }, c.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      background: i % 2 === 1 ? 'var(--ice-blue)' : 'var(--white)',
      borderTop: i === 0 ? 'none' : '1px solid var(--border)'
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("td", {
    key: c.key,
    style: {
      textAlign: c.align || 'left',
      padding: '14px 20px',
      fontSize: '13px',
      color: 'var(--navy)'
    }
  }, row[c.key])))))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Badge / pill.
 * Variants: brand (gradient fill), ice, outline (navy border), status.
 */
function Badge({
  variant = 'brand',
  status,
  children,
  style,
  ...rest
}) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontFamily: 'var(--font-heading)',
    fontWeight: 'var(--fw-medium)',
    fontSize: '11px',
    lineHeight: 1,
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    whiteSpace: 'nowrap'
  };
  const statusColors = {
    success: 'var(--status-success)',
    warning: 'var(--status-warning)',
    error: 'var(--status-error)',
    info: 'var(--status-info)'
  };
  const variants = {
    brand: {
      background: 'var(--gradient)',
      color: 'var(--white)'
    },
    ice: {
      background: 'var(--ice-blue)',
      color: 'var(--navy)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--navy)',
      border: '1px solid var(--navy)'
    },
    status: {
      background: 'var(--ice-blue)',
      color: 'var(--navy)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `mp-badge mp-badge--${variant}`,
    style: {
      ...base,
      ...variants[variant],
      ...style
    }
  }, rest), variant === 'status' && status && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: statusColors[status] || 'var(--status-info)',
      flexShrink: 0
    }
  }), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EcosystemTag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Ecosystem Tag — identifies which sub-brand content belongs to.
 * [color dot] [sub-brand name] in DM Mono, uppercase.
 */
const SUB_BRANDS = {
  mento: {
    name: 'Mento.IA',
    color: '#5de0e6'
  },
  campus: {
    name: 'My.Campus IA',
    color: '#0b3d2e'
  },
  well: {
    name: 'My.Well',
    color: '#0097b2'
  },
  linno: {
    name: 'LINNO',
    color: '#62bfd4'
  },
  cognition: {
    name: 'Cognition',
    color: '#ff66c4'
  }
};
function EcosystemTag({
  brand = 'mento',
  style,
  ...rest
}) {
  const b = SUB_BRANDS[brand] || SUB_BRANDS.mento;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: "mp-ecotag",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      textTransform: 'uppercase',
      letterSpacing: '1.5px',
      color: 'var(--mid-gray)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: b.color,
      flexShrink: 0
    }
  }), b.name);
}
Object.assign(__ds_scope, { EcosystemTag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EcosystemTag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Progress Bar. Ice track, gradient fill, optional label.
 */
function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = false,
  style,
  ...rest
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  return /*#__PURE__*/React.createElement("div", _extends({
    className: "mp-progress",
    style: {
      ...style
    }
  }, rest), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '8px',
      fontFamily: 'var(--font-heading)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: '12px',
      color: 'var(--navy)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), showValue && /*#__PURE__*/React.createElement("span", null, Math.round(pct), "%")), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    style: {
      height: '6px',
      borderRadius: '3px',
      background: 'var(--border)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      borderRadius: '3px',
      background: 'var(--gradient)',
      transition: 'width var(--dur-slow) var(--ease-default)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Checkbox — 18px, gradient fill when checked.
 * Controlled via `checked`; pass `onChange`.
 */
function Checkbox({
  label,
  checked = false,
  id,
  style,
  onChange,
  ...rest
}) {
  const boxId = id || (label ? `mp-cb-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: boxId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--navy)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: '18px',
      height: '18px',
      flexShrink: 0,
      borderRadius: '4px',
      border: checked ? '1.5px solid transparent' : '1.5px solid var(--light-gray)',
      background: checked ? 'var(--gradient)' : 'var(--white)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--dur-fast) var(--ease-default), border-color var(--dur-fast) var(--ease-default)'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: boxId,
    checked: checked,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      cursor: 'pointer'
    }
  }, rest)), checked && /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fdfdfd",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA text Input with optional label and helper/error text.
 */
function Input({
  label,
  helper,
  error = false,
  errorText,
  id,
  style,
  ...rest
}) {
  const inputId = id || (label ? `mp-input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 'var(--fw-medium)',
      fontSize: '13px',
      color: 'var(--navy)',
      marginBottom: '6px'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    className: "mp-input",
    "aria-invalid": error || undefined,
    style: {
      height: '44px',
      background: 'var(--white)',
      border: `1px solid ${error ? 'var(--input-error)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '0 16px',
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-regular)',
      fontSize: '14px',
      color: 'var(--navy)',
      outline: 'none',
      transition: 'border-color var(--dur-fast) var(--ease-default), box-shadow var(--dur-fast) var(--ease-default)',
      ...style
    }
  }, rest)), (error && errorText ? errorText : helper) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-light)',
      fontSize: '12px',
      color: error ? 'var(--input-error)' : 'var(--mid-gray)',
      marginTop: '4px'
    }
  }, error && errorText ? errorText : helper));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Radio — full circle, gradient fill when selected.
 */
function Radio({
  label,
  checked = false,
  name,
  id,
  style,
  onChange,
  ...rest
}) {
  const rId = id || (label ? `mp-radio-${String(label).replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: rId,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--navy)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: '18px',
      height: '18px',
      flexShrink: 0,
      borderRadius: '50%',
      border: checked ? '1.5px solid transparent' : '1.5px solid var(--light-gray)',
      background: checked ? 'var(--gradient)' : 'var(--white)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background var(--dur-fast) var(--ease-default), border-color var(--dur-fast) var(--ease-default)'
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    id: rId,
    name: name,
    checked: checked,
    onChange: onChange,
    style: {
      position: 'absolute',
      opacity: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      cursor: 'pointer'
    }
  }, rest)), checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: 'var(--white)'
    }
  })), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MY PATH.IA Select — input styling with a custom mid-gray chevron.
 */
function Select({
  label,
  helper,
  id,
  children,
  style,
  ...rest
}) {
  const selectId = id || (label ? `mp-select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const chevron = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 'var(--fw-medium)',
      fontSize: '13px',
      color: 'var(--navy)',
      marginBottom: '6px'
    }
  }, label), /*#__PURE__*/React.createElement("select", _extends({
    id: selectId,
    className: "mp-input mp-select",
    style: {
      height: '44px',
      background: `var(--white) ${chevron} no-repeat right 14px center`,
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0 40px 0 16px',
      fontFamily: 'var(--font-body)',
      fontSize: '14px',
      color: 'var(--navy)',
      outline: 'none',
      appearance: 'none',
      WebkitAppearance: 'none',
      cursor: 'pointer',
      transition: 'border-color var(--dur-fast) var(--ease-default), box-shadow var(--dur-fast) var(--ease-default)',
      ...style
    }
  }, rest), children), helper && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 'var(--fw-light)',
      fontSize: '12px',
      color: 'var(--mid-gray)',
      marginTop: '4px'
    }
  }, helper));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/app.jsx
try { (() => {
/* MY PATH.IA — Practitioner dashboard. Composes DS components. */
const DDS = window.MYPATHIADesignSystem_2f1489;
const {
  Logo,
  Button,
  Card,
  StatCard,
  Badge,
  ProgressBar,
  Table,
  Divider
} = DDS;
const NAV = [{
  section: 'Overview',
  items: ['Dashboard', 'People']
}, {
  section: 'Guidance',
  items: ['Paths', 'Reports', 'Sessions']
}, {
  section: 'Account',
  items: ['Settings']
}];
function Sidebar({
  active,
  onSelect
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 240,
      flexShrink: 0,
      background: 'var(--navy)',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 28px 24px'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: "dark",
    size: "sm"
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, NAV.map(g => /*#__PURE__*/React.createElement("div", {
    key: g.section
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: 'var(--on-dark-25)',
      padding: '0 28px 8px'
    }
  }, g.section), g.items.map(it => {
    const on = it === active;
    return /*#__PURE__*/React.createElement("a", {
      key: it,
      onClick: () => onSelect(it),
      style: {
        display: 'block',
        padding: '10px 28px',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        fontSize: 14,
        color: on ? 'var(--white)' : 'var(--on-dark-45)',
        background: on ? 'var(--gradient) left / 2px 100% no-repeat, rgba(255,255,255,0.07)' : 'transparent'
      }
    }, it);
  })))));
}
function TopBar({
  title
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 64,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 20,
      color: 'var(--navy)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    variant: "status",
    status: "success"
  }, "Live"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "New report")));
}
function Dashboard() {
  const [active, setActive] = React.useState('Dashboard');
  const rows = [{
    name: 'A. Rivera',
    path: 'Focus',
    status: /*#__PURE__*/React.createElement(Badge, {
      variant: "status",
      status: "success"
    }, "Active"),
    progress: '72%'
  }, {
    name: 'M. Chen',
    path: 'Balance',
    status: /*#__PURE__*/React.createElement(Badge, {
      variant: "status",
      status: "warning"
    }, "Pending"),
    progress: '48%'
  }, {
    name: 'K. Osei',
    path: 'Clarity',
    status: /*#__PURE__*/React.createElement(Badge, {
      variant: "status",
      status: "success"
    }, "Active"),
    progress: '91%'
  }, {
    name: 'L. Duarte',
    path: 'Purpose',
    status: /*#__PURE__*/React.createElement(Badge, {
      variant: "status",
      status: "info"
    }, "New"),
    progress: '12%'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--ice-blue)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: active,
    onSelect: setActive
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    title: active
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    value: "128",
    label: "People accompanied"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "94%",
    label: "Report clarity",
    surface: "white"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "36",
    label: "Active paths",
    surface: "white"
  }), /*#__PURE__*/React.createElement(StatCard, {
    value: "7",
    label: "Sessions this week"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    variant: "standard"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement(Divider, {
    width: "28px"
  }), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--navy)',
      margin: 0
    }
  }, "People in guidance")), /*#__PURE__*/React.createElement(Table, {
    columns: [{
      key: 'name',
      label: 'Person'
    }, {
      key: 'path',
      label: 'Path'
    }, {
      key: 'status',
      label: 'Status'
    }, {
      key: 'progress',
      label: 'Progress',
      align: 'right'
    }],
    rows: rows
  })), /*#__PURE__*/React.createElement(Card, {
    variant: "ice"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 16,
      color: 'var(--navy)',
      margin: '0 0 18px'
    }
  }, "Path progress"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    value: 72,
    label: "Focus",
    showValue: true
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 48,
    label: "Balance",
    showValue: true
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 91,
    label: "Clarity",
    showValue: true
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    value: 12,
    label: "Purpose",
    showValue: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm"
  }, "View all paths")))))));
}
Object.assign(window, {
  Dashboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/sections.jsx
try { (() => {
/* MY PATH.IA — Marketing site sections. Composes DS components + local layout. */
const DS = window.MYPATHIADesignSystem_2f1489;
const {
  Logo,
  Button,
  Card,
  StatCard,
  Badge,
  Divider,
  EcosystemTag
} = DS;
const NAV_LINKS = ['Ecosystem', 'Approach', 'For schools', 'Insights'];
function TopNav({
  onNav
}) {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const el = document.querySelector('.mp-site');
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 8);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 20,
      height: 64,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 64px',
      background: scrolled ? 'rgba(6,7,84,0.82)' : 'var(--navy)',
      backdropFilter: scrolled ? 'blur(8px)' : 'none',
      borderBottom: '1px solid rgba(255,255,255,0.07)'
    }
  }, /*#__PURE__*/React.createElement(Logo, {
    tone: "dark",
    size: "sm"
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 32
    }
  }, NAV_LINKS.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: l,
    onClick: () => onNav && onNav(l),
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 500,
      fontSize: 14,
      color: i === 0 ? 'transparent' : 'var(--on-dark-70)',
      cursor: 'pointer',
      ...(i === 0 ? {
        background: 'var(--gradient)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      } : {})
    }
  }, l)), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Request a demo")));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      background: 'var(--navy)',
      padding: '96px 64px 104px',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      top: -120,
      right: -80,
      width: 520,
      height: 520,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(83,44,249,0.12), transparent 60%)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement(Divider, {
    width: "64px",
    style: {
      marginBottom: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: 4,
      textTransform: 'uppercase',
      color: 'var(--on-dark-28)',
      marginBottom: 22
    }
  }, "Psychopedagogical & technology ecosystem"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 700,
      fontSize: 62,
      lineHeight: 1.04,
      letterSpacing: 0,
      margin: 0,
      maxWidth: 900,
      background: 'var(--gradient)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }
  }, "Build your tomorrow."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: 18,
      lineHeight: 1.7,
      color: 'var(--on-dark-50)',
      maxWidth: 560,
      marginTop: 24
    }
  }, "We offer clarity through accompaniment. Advanced AI works alongside professionals to help each person understand their purpose."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14,
      marginTop: 36
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary"
  }, "Request a demo"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, "Explore the ecosystem"))));
}
const FEATURES = [{
  t: 'Clarity',
  d: 'Precise, readable reports that turn data into a path a person can actually follow.'
}, {
  t: 'Accompaniment',
  d: 'Professionals stay at the center. The tools support the relationship, never replace it.'
}, {
  t: 'Purpose',
  d: 'Self-awareness grounded in real evidence — small steps toward a considered future.'
}];
function FeatureGrid() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--white)',
      padding: '80px 64px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Divider, {
    width: "32px"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      letterSpacing: 4,
      textTransform: 'uppercase',
      color: 'var(--mid-gray)'
    }
  }, "What we offer")), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: '-0.25px',
      color: 'var(--navy)',
      margin: '0 0 40px',
      maxWidth: 560
    }
  }, "A trusted guide, built on evidence"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 20
    }
  }, FEATURES.map(f => /*#__PURE__*/React.createElement(Card, {
    key: f.t,
    variant: "feature"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 20,
      color: 'var(--navy)',
      margin: '0 0 10px'
    }
  }, f.t), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 15,
      lineHeight: 1.75,
      color: 'var(--mid-gray)',
      margin: 0
    }
  }, f.d))))));
}
function StatsBand() {
  const stats = [{
    v: '94%',
    l: 'Report clarity'
  }, {
    v: '12k',
    l: 'People accompanied'
  }, {
    v: '5',
    l: 'Ecosystem brands'
  }, {
    v: '1:1',
    l: 'Human at the center'
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--navy)',
      padding: '64px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 3,
      background: 'var(--gradient)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)'
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.l,
    style: {
      padding: '0 32px',
      borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.07)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: 46,
      lineHeight: 1,
      background: 'var(--gradient)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    }
  }, s.v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 14,
      color: 'var(--on-dark-50)',
      marginTop: 14
    }
  }, s.l)))));
}
const SUBS = [{
  key: 'mento',
  name: 'Mento.IA',
  d: 'Focused on your future.',
  c: '#5de0e6'
}, {
  key: 'campus',
  name: 'My.Campus IA',
  d: 'Unlimited made real.',
  c: '#0b3d2e'
}, {
  key: 'well',
  name: 'My.Well',
  d: 'Balanced Minds.',
  c: '#0097b2'
}, {
  key: 'linno',
  name: 'LINNO',
  d: 'Connect yourself.',
  c: '#62bfd4'
}, {
  key: 'cognition',
  name: 'Cognition',
  d: 'Small steps. Big dreams.',
  c: '#ff66c4'
}];
function EcosystemMap() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--navy)',
      padding: '32px 64px 88px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 22,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: 'var(--on-dark-40)',
      margin: '0 0 32px'
    }
  }, "The ecosystem"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 16
    }
  }, SUBS.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.key,
    className: "mp-card mp-card--dark",
    style: {
      background: 'var(--dark-surface)',
      border: '1px solid var(--dark-border)',
      borderTop: `2px solid ${s.c}`,
      borderRadius: 12,
      padding: 24,
      transition: 'border-color 200ms'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 15,
      color: 'var(--white)'
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 12,
      color: 'var(--on-dark-45)',
      marginTop: 6
    }
  }, s.d))))));
}
function Testimonial() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--ice-blue)',
      padding: '80px 64px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: '0 auto',
      borderLeft: '4px solid transparent',
      borderImage: 'var(--gradient) 1',
      paddingLeft: 32
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 500,
      fontSize: 20,
      fontStyle: 'italic',
      lineHeight: 1.8,
      color: 'var(--navy)',
      margin: 0
    }
  }, "The reports gave our team language we could act on. For the first time, the data pointed to a person \u2014 not a score."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 14,
      color: 'var(--navy)'
    }
  }, "Dra. Elena M\xE1rquez"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-body)',
      fontWeight: 300,
      fontSize: 13,
      color: 'var(--mid-gray)',
      marginTop: 2
    }
  }, "Head of Guidance, Colegio San Marco"))));
}
function Footer() {
  const cols = [{
    h: 'Ecosystem',
    links: ['Mento.IA', 'My.Campus IA', 'My.Well', 'LINNO', 'Cognition']
  }, {
    h: 'Company',
    links: ['Approach', 'For schools', 'Insights', 'Contact']
  }, {
    h: 'Legal',
    links: ['Privacy', 'Terms', 'Data ethics']
  }];
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--navy)',
      padding: '64px 64px 32px',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      background: 'var(--gradient)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Logo, {
    tone: "dark",
    size: "sm"
  })), cols.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.h
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-heading)',
      fontWeight: 600,
      fontSize: 12,
      color: 'var(--white)',
      marginBottom: 16
    }
  }, c.h), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, c.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    style: {
      fontFamily: 'var(--font-body)',
      fontSize: 13,
      color: 'var(--on-dark-45)',
      cursor: 'pointer'
    }
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: '40px auto 0',
      paddingTop: 24,
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: 1,
      color: 'var(--on-dark-18)'
    }
  }, "\xA9 2026 MY PATH.IA \xB7 mypath.ia"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      letterSpacing: 1,
      color: 'var(--on-dark-18)'
    }
  }, "@mypath.ia")));
}
Object.assign(window, {
  TopNav,
  Hero,
  FeatureGrid,
  StatsBand,
  EcosystemMap,
  Testimonial,
  Footer
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/sections.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Logo = __ds_scope.Logo;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.EcosystemTag = __ds_scope.EcosystemTag;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

})();
