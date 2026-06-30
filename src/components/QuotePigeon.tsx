type QuotePigeonProps = {
  /** 載入中：輕微彈跳＋左右踱步 */
  animated?: boolean;
  size?: number;
  className?: string;
  label?: string;
};

export function QuotePigeon({
  animated = false,
  size = 64,
  className = "",
  label = "載入中",
}: QuotePigeonProps) {
  return (
    <div
      className={`quote-pigeon ${animated ? "quote-pigeon--animated" : ""} ${className}`}
      style={{ width: size, height: size }}
      role={animated ? "status" : "img"}
      aria-label={animated ? label : "報價鴿"}
    >
      <img
        src="/quote-pigeon.png"
        alt=""
        className="quote-pigeon__sprite"
        width={size}
        height={size}
        draggable={false}
      />
      {animated && <span className="sr-only">{label}</span>}
    </div>
  );
}

export function QuotePigeonLoader({
  label = "載入中…",
  size = 72,
  className = "",
}: {
  label?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`quote-pigeon-loader ${className}`}>
      <QuotePigeon animated size={size} label={label} />
      {label ? <p className="quote-pigeon-loader__label">{label}</p> : null}
    </div>
  );
}
