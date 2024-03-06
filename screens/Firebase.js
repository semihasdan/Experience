import "firebase/firestore";
import "firebase/auth";
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
    apiKey: "***-*",
    authDomain: "****",
    projectId: "****",
    storageBucket: "*****",
    messagingSenderId: "*****",
    appId: "1:***",
    measurementId: "G-***"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
export const db = firebase.firestore();
export const storage = firebase.storage();
