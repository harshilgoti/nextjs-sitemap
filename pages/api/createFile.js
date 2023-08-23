import fsPromise from "fs/promises";
import fs from "fs";
import path from "path";
import moment from "moment";
import fetch from "node-fetch";
const convert = require("xml-js");

const yearFolderPath = path.join(process.cwd(), `${new Date().getFullYear()}`),
  monthFolderPath = path.join(yearFolderPath, `${new Date().getMonth()}`),
  dateFolderPath = path.join(monthFolderPath, `${new Date().getDate()}`),
  filePath = path.join(dateFolderPath, "sitemap.xml"),
  publicPath = path.join(process.cwd(), "public", "sitemap.xml"),
  untrackedUrlsList = [],
  options = { compact: true, ignoreComment: true, spaces: 4 },
  hostBlogBaseURL = "https://yoursite.com/blog";

/* 
    Method to Filter/Unique already existing URLs and new urls we fetched from DB
*/
const filterUniqueURLs = (filePath) => {
  fs.readFile(filePath, (err, data) => {
    if (data) {
      let existingSitemapList = JSON.parse(convert.xml2json(data, options));
      let existingSitemapURLStringList = [];
      if (
        existingSitemapList.urlset &&
        existingSitemapList.urlset.url &&
        existingSitemapList.urlset.url.length
      ) {
        existingSitemapURLStringList = existingSitemapList.urlset.url.map(
          (ele) => ele.loc._text
        );
      }

      untrackedUrlsList.forEach((ele) => {
        if (existingSitemapURLStringList.indexOf(ele) == -1) {
          existingSitemapList.urlset.url.push({
            loc: {
              _text: ele,
            },
            changefreq: {
              _text: "monthly",
            },
            priority: {
              _text: 0.8,
            },
            lastmod: {
              _text: moment(new Date()).format("YYYY-MM-DD"),
            },
          });
        }
      });
      createSitemapFile(existingSitemapList);
    }
  });
};

/* 
  Method to convert JSON format data into XML format
*/
const createSitemapFile = (list) => {
  const finalXML = convert.json2xml(list, options); // to convert json text to xml text
  saveNewSitemap(finalXML);
};

/* 
  Method to Update sitemap.xml file content
*/
const saveNewSitemap = (xmltext) => {
  fs.writeFile(filePath, xmltext, (err) => {
    if (err) {
      return console.log(err);
    }

    console.log("The file was saved!");
  });

  fs.readFile(publicPath, async (err, data) => {
    if (!data) {
      fs.writeFile(publicPath, xmltext, (err) => {
        if (err) {
          return console.log(err);
        }
        console.log("The file was saved in public!");
      });
    } else {
      let existingSitemapList = JSON.parse(convert.xml2json(data, options));
      let updatedSitemapList = JSON.parse(convert.xml2json(xmltext, options));

      existingSitemapList.urlset.url = existingSitemapList.urlset.url.concat(
        updatedSitemapList.urlset.url
      );

      const finalXML = convert.json2xml(existingSitemapList, options);

      fs.writeFile(publicPath, finalXML, (err) => {
        if (err) {
          return console.log(err);
        }

        console.log("Final xml");
      });
    }
  });
};

export default async function handler(req, res) {
  const createFolder = async (folderName, isDate) => {
    const folderPath = folderName;
    try {
      await fsPromise.access(folderPath, fsPromise.constants.R_OK, (err) => {
        console.log("\n> Checking Permission for reading the file");
        if (err) console.error("No Read access");
        else console.log("File can be read");
      });
      // folder exists
    } catch {
      // folder doesn't exist
      await fsPromise.mkdir(folderPath);
      if (isDate) {
        const fileContent =
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">' +
          "    <url>" +
          "       <loc>https://www.plusonex.com/</loc>" +
          "       <lastmod>2023-06-20T05:25:43+00:00</lastmod>" +
          "       <priority>1.00</priority>" +
          "    </url>" +
          "    <url>" +
          "       <loc>https://www.plusonex.com/</loc>" +
          "       <lastmod>2023-06-20T05:25:43+00:00</lastmod>" +
          "       <priority>1.00</priority>" +
          "    </url>" +
          "</urlset>";
        fs.writeFileSync(filePath, fileContent);
      }
    }
  };

  await fetch("https://jsonplaceholder.typicode.com/posts")
    .then((res) => res.json())
    .then(async (dataJSON) => {
      if (dataJSON) {
        await createFolder(yearFolderPath);
        await createFolder(monthFolderPath);
        await createFolder(dateFolderPath, true)
          .then((res) => {
            if (dataJSON) {
              dataJSON.forEach((element) => {
                const modifiedURL = element.title.replace(/ /g, "-");
                untrackedUrlsList.push(`${hostBlogBaseURL}/${modifiedURL}`);
              });
              filterUniqueURLs(filePath);
            }
          })
          .catch((er) => {
            console.log("er", er);
          });
      }
    })
    .catch((error) => {
      console.log("error", error);
    });

  res.status(200).json({ message: "File created successfully." });
}
