import React, { useEffect } from "react";
import axios from "axios";
var CronJob = require("cron").CronJob;
var job = new CronJob(
  "2 * * * * *",
  function () {
    const createFile = async () => {
      try {
        await axios.post("/api/createFile");
      } catch (error) {
        // console.error("Error creating file:", error);
      }
    };
    createFile();
  },
  null,
  true
);

export default function SiteMap() {
  useEffect(() => {
    job.start();
  }, []);

  return (
    <div>
      <h1>Home page</h1>
    </div>
  );
}
