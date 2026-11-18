export default function Brand() {
  return (
    <a className="brand" href="#inicio" aria-label="Sanes Brindes, início">
      <svg width="32" height="43" viewBox="0 0 40 54" aria-hidden="true">
        <defs>
          <linearGradient id="gold" x2="1" y2="1">
            <stop stopColor="#a17a19" />
            <stop offset=".5" stopColor="#ffcf25" />
            <stop offset="1" stopColor="#d1a524" />
          </linearGradient>
        </defs>
        <path
          d="M38 0C11 6 1 10 5 23c2 7 23 13 24 18C22 43 6 45 2 54c29-5 37-11 33-23C32 23 11 18 10 14 26 13 36 10 38 0Z"
          fill="url(#gold)"
        />
      </svg>
      <span>
        SANES <span className="brand-sub">BRINDES</span>
      </span>
    </a>
  );
}
