import { Fragment } from "react"
import { Disclosure, Menu, Transition } from "@headlessui/react"
import cn from "classnames"
import Link from "next/link"
import { Logo, Mark } from "./logo"
import { signOut, useSession } from "next-auth/react"

const navigation = [
  /* { name: "Play", href: "/", current: false }, */
  { name: "Leaderboard", href: "/leaderboard", current: true },
  /* { name: "My Games", href: "/", current: false }, */
]

export default function Nav() {
  const { data: session, status } = useSession()

  return (
    <Disclosure as="nav" className="bg-blue-3">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/">
                    <Mark className="block h-8 w-auto lg:hidden" />
                    <Logo className="hidden h-10 -mt-1 w-auto lg:block" />
                  </Link>
                </div>
                <div className="ml-6 flex items-center space-x-4">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className={cn(
                        false /* item.current */
                          ? "bg-blue-6 text-blue-12"
                          : "text-blue-12 hover:bg-blue-7 hover:text-blue-12",
                        "px-3 py-2 rounded-md text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-12 focus:ring-offset-2 focus:ring-offset-blue-4"
                      )}
                      /* aria-current={item.current ? "page" : undefined} */
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
              </div>
              <div className="flex items-center">
                {/* <div className="flex-shrink-0"> */}
                {/*   <button */}
                {/*     type="button" */}
                {/*     className="relative inline-flex items-center rounded-md border border-transparent bg-blue-9 px-4 py-2 text-sm font-medium text-blue-12 hover:bg-blue-10 focus:outline-none focus:ring-2 focus:ring-blue-9 focus:ring-offset-2 focus:ring-offset-blue-4" */}
                {/*   > */}
                {/*     <span>Play Now</span> */}
                {/*   </button> */}
                {/* </div> */}
                <div className="ml-4 flex flex-shrink-0 items-center">
                  {/* Profile dropdown */}
                  {session?.user?.image && (
                    <Menu as="div" className="relative ml-3">
                      <div>
                        <Menu.Button className="flex rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-12 focus:ring-offset-2 focus:ring-offset-blue-4">
                          <span className="sr-only">Open user menu</span>
                          <img
                            className="h-8 w-8 rounded-full"
                            src={session.user.image}
                            alt={session?.user?.name ?? "Anonymous"}
                          />
                        </Menu.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-blue-5 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                className={cn(
                                  active ? "bg-blue-7" : "",
                                  "block w-full px-4 py-2 text-sm text-blue-12"
                                )}
                                onClick={() => signOut()}
                              >
                                Sign out
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </Disclosure>
  )
}
