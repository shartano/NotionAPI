import { Client } from "@notionhq/client";
import { config } from "dotenv";

config();

const DocDB = process.env.DOC_DB_ID;
const TsDB = process.env.TS_DB_ID;
const apiKey = process.env.NOTION_API_KEY;


const notion = new Client({ auth: apiKey });


async function cmpLists(tasks, timesheets) {
    const newTimesheets = [];
    const delTimesheets = [];

    console.log("Tasks:", tasks.map(t => t.name));
    console.log("Timesheets:", timesheets.map(ts => ts.name));

    // Find tasks that are missing a timesheet
    for (const task of tasks) {
        const exists = timesheets.some(ts => {
            const tsTask = ts.name.split(" - ")[1]?.trim();
            return tsTask.toLowerCase() === task.name.toLowerCase();
        });
        if (!exists) {
            console.log("Task missing timesheet:", task.name);
            newTimesheets.push(task);
        }
    }

    // Find timesheets that don't have a matching task
    for (const ts of timesheets) {
        const tsTask = ts.name.split(" - ")[1]?.trim();
        const exists = tasks.some(task => task.name.toLowerCase() === tsTask.toLowerCase());
        if (!exists) {
            console.log("Timesheet has no matching task:", ts.name);
            delTimesheets.push(ts);
        }
    }

    console.log("Final newTimesheets:", newTimesheets.map(t => t.name));
    console.log("Final delTimesheets:", delTimesheets.map(ts => ts.name));

    return { newTimesheets, delTimesheets };
}




async function fetchTasks(tasks){

    const taskNames = [];
    let num = 0;
    try{
        for( const task of tasks){
            const page = await notion.pages.retrieve({page_id: task.id});
            const name = page.properties.Name.title
                .map(name => name.plain_text)
                .join("");


            taskNames.push({name: name, id: task.id});
            num++;
        }
        return taskNames; 
        
    }catch(err){
        console.error("Error fetching task names: ", err);
    }
}

async function fetchTimesheets(timesheets){

    const timesheetNames = [];
    let num = 0;
    try{
        for( const timesheet of timesheets){
            const page = await notion.pages.retrieve({page_id: timesheet.id});
            const name = page.properties.Name.title
                .map(name => name.plain_text)
                .join("");


            timesheetNames.push({name: name, id: timesheet.id});
            num++;
        }
        return timesheetNames; 
        
    }catch(err){
        console.error("Error fetching task names: ", err);
    }
}

async function deleteTimesheets(timesheets){
    
    for(const ts of timesheets){
        try{
            const response = await notion.pages.update({page_id: ts.id, archived: true })
            if(response){
                console.log("Archived page: ", ts.name)
            }
        }catch(err){
            console.error("Failed to archive page: " , err)
        }
        
        
    }
         
}


async function createTimesheets(tasks, page){
    for(const tsk of tasks){
        const docID = page.id;
        const docOwner = page.properties.Person?.relation?.[0]?.id;
        const ownerName = page.properties.NotionProfile.formula.string;
        const submissionDate = page.properties.Date?.date?.start;
        const teamID = page.properties.Team.relation[0]?.id;
        if (!docOwner || !submissionDate || !teamID) {
            console.log("Skipping task due to missing required info:", tsk.name, docOwner, teamID);
            continue;
        }

        const docName = ownerName + " - " + tsk.name + " - " ;


        

        try{
            const response = await notion.pages.create({
                parent: {database_id: TsDB},
                icon: {
                emoji: "⏱️"
            },
                properties: {
                    Name: {title: [
                        {text: {
                            content: docName
                        }}
                    ]},
                    Person: {relation: [{id: docOwner}]},
                    Document: {relation: [{id: docID}]}, 
                    Date: {date: {start: submissionDate}},
                    Team: {relation: [{id: teamID}]},
                    Task: {relation: [{id: tsk.id}]},
                }
            });
            console.log("Created timesheet:", response.url);
        }catch(err){
            console.error("Error creating timesheets for task", tsk.name, err)
        }
    }
}


async function main() {
  try {
    const response = await notion.databases.query({ database_id: DocDB });

    const page = response.results[0];

    

    const taskNames = await fetchTasks(page.properties.Tasks.relation);
    const timesheetNames = await fetchTimesheets(page.properties.TimeSheets.relation);
    const cmp = await cmpLists(taskNames, timesheetNames);

       if(cmp.newTimesheets.length > 0){
        console.log("Adding new timesheets ", );
       }

        console.log("Adding new timesheets " , cmp.newTimesheets ,"\ndeleting ", cmp.delTimesheets);

    await deleteTimesheets(cmp.delTimesheets);
    await createTimesheets(cmp.newTimesheets, page);

 
  } catch (err) {
    console.error("Error querying Notion:", err.message);
  }
}



main();
