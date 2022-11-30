import React from "react"
import { Layout } from "../components/layout"
import Nav from "../components/nav"

function Terms() {
  return (
    <Layout>
      <Nav />
      <main className="container mx-auto max-w-sm md:max-w-3xl p-8 text-orange-9">
        <h1 className="text-3xl font-display font-black">Terms of Service</h1>
        <ul>
          <li>no bots, k?</li>
        </ul>
      </main>
    </Layout>
  )
}

export default Terms
