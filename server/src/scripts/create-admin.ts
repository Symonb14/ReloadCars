/**
 * Creates an admin account, or promotes an existing account to admin.
 *
 *   npm run create-admin -- --email admin@reloadcars.com --name "Admin" --password "..."
 *
 * This is the only way to get the admin role: sign-up always creates drivers.
 */
import { parseArgs } from 'node:util'
import { eq } from 'drizzle-orm'
import { auth } from '../auth.ts'
import { db } from '../db/client.ts'
import { user } from '../db/schema/index.ts'

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string', default: 'Admin' },
    password: { type: 'string' },
  },
})

if (!values.email) {
  console.error(
    'Usage: npm run create-admin -- --email <email> [--name <name>] [--password <password>]',
  )
  process.exit(1)
}

const email = values.email.toLowerCase()
const [existing] = await db.select().from(user).where(eq(user.email, email))

if (!existing) {
  if (!values.password) {
    console.error(`No account for ${email}; pass --password to create one.`)
    process.exit(1)
  }

  await auth.api.signUpEmail({
    body: { email, name: values.name, password: values.password },
  })
}

await db.update(user).set({ role: 'admin' }).where(eq(user.email, email))

console.log(`${email} is now an admin${existing ? ' (existing account promoted)' : ''}.`)
process.exit(0)
