import cn from "classnames"
import { ReactNode } from "react"
import Link, { LinkProps } from "next/link"

type BaseProps = {
  children: React.ReactNode
  secondary?: boolean
  className?: string
  disabled?: boolean
  full?: boolean
  color?: string
  darker?: string
  darkest?: string
  state?: "success" | "error"
  chosen?: boolean
}

type ButtonAsButton = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    as?: "button"
  }

type ButtonAsLink = BaseProps &
  Omit<LinkProps, keyof BaseProps | "as"> & {
    as: "link"
  }

type ButtonAsExternal = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    as: "a"
  }

type ButtonProps = ButtonAsButton | ButtonAsExternal | ButtonAsLink

export const Button: React.FC<ButtonProps> = ({
  state,
  chosen,
  disabled,
  full,
  secondary,
  color = "bg-blue-9",
  darker = "#0954a5",
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

  if (secondary) {
    color = "bg-transparent border-2 border-blue-8"
  }

  const className = cn({
    "relative inline-block border-none bg-transparent p-0 cursor-pointer outline-offset-4 transition filter duration-[250ms]":
      true,
    "hover:filter hover:brightness-110 group focus:outline-none select-none":
      true,
    "cursor-not-allowed": disabled,
    "w-full md:w-96": full,
    [props.className ?? ""]: !!props.className,
  })

  const style = { WebkitTapHighlightColor: "transparent" }
  const children: ReactNode = (
    <>
      {!secondary && (
        <span className="absolute top-0 left-0 w-full h-full rounded-xl bg-black/25 will-change-transform transform translate-y-[2px] transition-transform duration-[600ms] ease-[cubic-bezier(0.3,0.7,0.4,1)] group-hover:transform group-hover:translate-y-1 group-hover:transition-transform group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(0.3,0.7,0.4,1.5)] group-active:transform group-active:translate-y-[1px] group-active:transition-transform group-active:duration-[34ms] blur-sm" />
      )}
      {!secondary && (
        <span
          className="absolute top-0 left-0 w-full h-full rounded-xl"
          style={{
            background: `linear-gradient(to left, ${darkest} 0%, ${darker} 8%, ${darker} 92%, ${darkest} 100%)`,
          }}
        />
      )}
      <span
        className={cn({
          "flex items-center justify-center space-x-2 relative px-2 py-3 rounded-xl text-xl text-white":
            true,
          [color ?? ""]: true,
          "will-change-transform transform -translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.3,0.7,0.4,1)]":
            true,
          "group-hover:transition-transform group-hover:transform group-hover:-translate-y-[6px] group-hover:duration-[250ms] group-hover:ease-[cubic-bezier(0.3,0.7,0.4,1.5)]":
            true,
          "group-active:transform group-active:-translate-y-[2px] group-active:transition-transform group-active:duration-[34ms]":
            true,
          "w-full sm:max-w-96": full,
          [props.className ?? ""]: !!props.className,
          "text-blue-9": secondary,
        })}
      >
        {props.children}
      </span>
    </>
  )

  const styleProps = {
    className,
    style,
    children,
    disabled,
  }

  if (props.as === "a") {
    return (
      <a {...props} {...styleProps} target="_blank" rel="noopener noreferrer" />
    )
  } else if (props.as === "link") {
    return <Link {...props} {...styleProps} as={undefined} />
  } else {
    return (
      <button
        {...props}
        {...styleProps}
        className={cn({
          [styleProps.className ?? ""]: !!styleProps.className,
          "pointer-events-none": state === "success" || state === "error",
          "animate-shake": state === "error" && chosen,
          "cursor-not-allowed": disabled,
        })}
      />
    )
  }
}
