import axios from "axios";
import {tool} from "langchain";
import * as z from "zod"; 


export const listFiles = tool(
    async ({},config)=> {

        const writer = config.writer;

        writer("Listing files in the project directory...\n");


         const response = await axios.get(`http://sandbox-service-${config.context.projectId}:3000/list-files`);
         
         writer("Files listed successfully."+ "files: " + response.data.files.join(",")+"\n");

        return JSON.stringify(response.data.files);
},
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are avaliable to work with.",
        schema: z.object({})
    }

);


export const readFiles = tool(
    async ({ files = [] }, config) => {
        const writer = config.writer;

        writer("Reading contents of files..."+files.join(",")+"\n");

        const response = await axios.get(
            `http://sandbox-service-${config.context.projectId}:3000/read-files?files=` + files.join(",")
        );
        writer("Files read successfully.\n");

        return JSON.stringify(response.data);
    },
    {
        name: "read_files",
        description: "Read the contents of specified files. This is useful for understanding the contents of files that are relevant to the task at hand. ",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files absolute paths to read .These should be files that were listed using the list_files tool or created later .")
        })
    }
);
 // export const updateFiles = tool(
//     async ({files})=>{
//         const response = await axios.post("http://01a03463-f515-77aa-9679-dde6af0908a9.agent.localhost/update-files",{
//             updates: files
//         })
//         return JSON.stringify(response.data.results);
//     },
//     {
//         name: "update_files",
//         description: "Update the files contents of specified files. This is useful for making changes to file.",
//         inputSchema: z.object({
//             files: z.array(z.object({
//                file: z.string().describe("The absoulte path of the file to update"),
//                content: z.string().describe("The new content for the files")
//             })).describe("The list of files to update and their new contents")
//         })
//     }
// )

export const updateFiles = tool(
    async ({files},config)=>{
       const writer = config.writer;
        writer("Updating files..."+files.map(f => f.file).join(",")+"\n");
       

        const response = await axios.patch(`http://sandbox-service-${config.context.projectId}:3000/update-files`,{
            updates: files
        })
        writer("Files updated successfully.\n");


        return JSON.stringify(response.data.results);
    },
    {
        name: "update_files",
        description: "Update the files contents of specified files. This is useful for making changes to file base on the requirements of the task at hand. this tool can also use to create new file by providing a new file name in the file field and the content th be added in the content field .",
        schema: z.object({
            files: z.array(z.object({
               file: z.string().describe("The absoulte path of the file to update"),
               content: z.string().describe("The new content for the files")
            })).describe("The list of files to update and their new contents")
        })
    }
)


