import * as functions from 'firebase-functions';
import Mailtracker from './mailtracker';
import * as requestIp from 'request-ip';
import * as express from 'express';

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const secretClient = new SecretManagerServiceClient();
const accessSecretVersion = async (resourceId: string): Promise<string> => {
  let [version] = await secretClient.accessSecretVersion({name: resourceId});
  if (!version.payload?.data) {
    throw `Can't load secret ${resourceId}`;
  }
  return version.payload.data.toString();
}

const cors = require('cors')({origin: true});
const app = express();
app.use(cors);

(async () => {


  const ipStackAccessKey = await accessSecretVersion('projects/1049804873495/secrets/ipstack-access-key/versions/latest')
  const yahooMailtrackerPassword = await accessSecretVersion('projects/1049804873495/secrets/yahoo-mailtracker-password/versions/latest')

  const mailTracker = new Mailtracker(ipStackAccessKey, yahooMailtrackerPassword)

  app.get('/create', async (request: express.Request, response: express.Response) => {
    const description: string = request.query.description as string;
    const id = await mailTracker.createImage(description)
    response.send({id});
  })

  app.get('/activate', async (request: express.Request, response: express.Response) => {
    const id: string = request.query.imgId as string;
    await mailTracker.activate(id)
    response.status(200).end();
  })

  app.get('/track', async (request: express.Request, response: express.Response) => {
    const clientIp = requestIp.getClientIp(request);
    const id: string = request.query.imgId as string;
    const alertSent: boolean = await mailTracker.track(id, clientIp);
    console.log('alertSent ', alertSent)
    const data = 'iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAGElEQVR42mNkIBEwjmoY1TCqYVQDbTUAAD4EABn7wZirAAAAAElFTkSuQmCC'
    const buffer = Buffer.from(data, 'base64');
    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'image/png',
      'Content-Length': buffer.length
    });
    response.end(buffer);
  })

})()

exports.mailTracker = functions.region('europe-west3').https.onRequest(app);

