import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
import { firestore } from 'firebase-admin/lib/firestore';
import * as nodemailer from 'nodemailer'
import axios, { AxiosResponse } from 'axios';
import { pick } from 'lodash'
import DocumentSnapshot = firestore.DocumentSnapshot;

const moment = require('moment-timezone');


interface Img {
  active: boolean;
  description: string;
  views: {
    time: string;
    ip: string | null;
    location: IpLocation | null;
  }[]
}

const ipLocationFields = ['ip', 'country_name', 'city', 'zip', 'latitude', 'longitude']

export interface IpLocation {
  ip: string;
  country_name: string;
  city: string;
  zip?: any;
  latitude: number;
  longitude: number;
}


export default class Mailtracker {
  public ipStackAccessKey: string;
  public yahooMailPassword: string;
  private imgCollection: FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData>
  private converter: { toFirestore: (data: Img) => Img; fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) => Img };
  private db: FirebaseFirestore.Firestore;

  constructor(ipStackAccessKey: string, yahooMailPassword: string) {
    this.ipStackAccessKey = ipStackAccessKey;
    this.yahooMailPassword = yahooMailPassword;
    admin.initializeApp(functions.config().firebase)
    this.db = admin.firestore()
    this.imgCollection = this.db.collection('img')


    this.converter = {
      toFirestore: (data: Img) => data,
      fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
        snap.data() as Img
    }
  }

  ipUrl = (ip: string): string => {
    return `http://api.ipstack.com/${ip}?access_key=${this.ipStackAccessKey}`
  }


  sendTrackAlert = (id: string, img: Img) => {

    const transport = nodemailer.createTransport({
      host: 'smtp.mail.yahoo.com',
      port: 465,
      secure: true,
      auth: {
        user: 'mail_tracker',
        pass: this.yahooMailPassword
      }
    })
    transport.sendMail({
      from: 'mail_tracker@yahoo.com',
      to: 'alfredo.scaccialepre@gmail.com',
      subject: `Tracker ${id}`,
      text: `Tracker ${id} for ${img.description}. Views: ${JSON.stringify(img.views)}`,
    }, ((err, info) => {
      if (err) {
        console.error(err)
      }
      console.log(info)
    }))
  }

  createImage = async (description: string): Promise<string> => {
    const img: Img = {
      active: false,
      description,
      views: []
    }
    const added = await this.db.collection('img').add(img);
    return added.id
  }


  activate = async (id: string) => {
    const imgSnap: DocumentSnapshot<Img> = await this.imgCollection.doc(id).withConverter(this.converter).get()
    const img = imgSnap?.data();
    if (img) {
      img.active = true
      return this.imgCollection.doc(id).update(img)
    }
    throw `${id} not found`
  }


  geoLocate = async (ip: string | null): Promise<IpLocation | null> => {
    if (!ip) return Promise.resolve(null)
    const ipResponse: AxiosResponse<IpLocation> = await axios.get(this.ipUrl(ip))
    if (ipResponse.status === 200) {
      return pick(ipResponse.data, ipLocationFields) as IpLocation | null;
    }
    return Promise.resolve(null)

  }

  track = async (id: string, clientIp: string | null) => {
    const imgSnap: DocumentSnapshot<Img> = await this.imgCollection.doc(id).withConverter(this.converter).get()
    const img = imgSnap?.data();
    if (img?.active) {

      const location = await this.geoLocate(clientIp)

      img.views.push({
        ip: clientIp,
        time: moment().tz('Europe/Rome').format(),
        location
      })
      await this.imgCollection.doc(id).update(img)
      console.log(`${id} was active`)
      this.sendTrackAlert(id, img);
      return true;
    } else {
      console.log(`${id} was inactive`)
      return false;
    }
  }
}

