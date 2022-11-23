import { ComponentProps } from "react"
import Nav from "./nav"

export const Layout: React.FC<ComponentProps<"div">> = ({ children }) => {
  return (
    <>
      <Nav />
      <main className="container mx-auto max-w-sm md:max-w-3xl p-8 text-orange-9">
        {children}
      </main>
    </>
  )
}
