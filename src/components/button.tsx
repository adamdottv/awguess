import cn from "classnames"

export interface ButtonProps extends React.ComponentProps<"button"> {
  state?: "success" | "error"
  chosen?: boolean
  full?: boolean
  color?: string
  darker?: string
  darkest?: string
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  state,
  chosen,
  disabled,
  full,
  color = "bg-blue-9",
  darker = "#0a4481",
  darkest = "#10243e",
  ...props
}) => {
  if (state === "error" && chosen) {
    color = "bg-red-9"
    darker = "#822025"
    darkest = "#3c181a"
  } else if (state === "success") {
    color = "bg-green-9"
    darker = "#1b543a"
    darkest = "#0f291e"
  }

  return (
    <button
      className={cn({
        "relative border-none bg-transparent p-0 cursor-pointer outline-offset-4 transition filter duration-[250ms]":
          true,
        "hover:filter hover:brightness-110 group focus:outline-none select-none":
          true,
        "pointer-events-none": state === "success" || state === "error",
        "animate-shake": state === "error" && chosen,
        /* "border-orange-9 after:bg-orange-9 hover:border-orange-11 hover:text-orange-11 hover:after:bg-orange-11": */
        /*   state === undefined || (state === "error" && !chosen), */
        "cursor-not-allowed": disabled,
        "w-full": full,
        [className ?? ""]: !!className,
      })}
      style={{ WebkitTapHighlightColor: "transparent" }}
      disabled={disabled}
      {...props}
    >
      <span className="absolute top-0 left-0 w-full h-full rounded-xl bg-black/25 will-change-transform transform translate-y-[2px] transition-transform duration-[600ms] ease-[cubic-bezier(0.3,0.7,0.4,1)] group-hover:transform group-hover:translate-y-1 group-hover:transition-transform group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(0.3,0.7,0.4,1.5)] group-active:transform group-active:translate-y-[1px] group-active:transition-transform group-active:duration-[34ms] blur-sm" />
      <span
        className="absolute top-0 left-0 w-full h-full rounded-xl"
        style={{
          background: `linear-gradient(to left, ${darkest} 0%, ${darker} 8%, ${darker} 92%, ${darkest} 100%)`,
        }}
      />
      <span
        className={cn({
          "flex items-center justify-center space-x-2 relative px-2 py-3 rounded-xl text-xl text-white":
            true,
          [color]: true,
          "will-change-transform transform -translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.3,0.7,0.4,1)]":
            true,
          "group-hover:transition-transform group-hover:transform group-hover:-translate-y-[6px] group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(0.3,0.7,0.4,1.5)]":
            true,
          "group-active:transform group-active:-translate-y-[2px] group-active:transition-transform group-active:duration-[34ms]":
            true,
        })}
      >
        {children}
      </span>
    </button>
  )
}
