async function main() {
  try {
    const response = await notion.users.list()
    console.log("Users in workspace:")
    response.results.forEach(user => {
      console.log(user.name, "-", user.id)
    })
  } catch (err) {
    console.error("Error calling Notion API:", err.message)
  }
}
