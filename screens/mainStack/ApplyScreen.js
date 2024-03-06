import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { db } from '../Firebase';
import firebase from 'firebase/compat';
import { formatDistanceToNow } from 'date-fns';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ApplyScreen = ({ route, navigation }) => {
    const { jobDetails } = route.params;
    const [offerPrice, setOfferPrice] = useState(jobDetails.price.toString());
    const [offerTitle, setOfferTitle] = useState('');
    const [offerDescription, setOfferDescription] = useState('');
    const [userDetails, setUserDetails] = useState(null);
    const [applicantEmail, setApplicantEmail] = useState('');
    const [offerExists, setOfferExists] = useState(false);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: () => (
                <View>
                    <Text style={styles.headerName}>Apply Screen</Text>
                </View>
            ),
            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={25} color="#000" />
                </TouchableOpacity>
            ),
        });
    }, []);

    useEffect(() => {
        const currentUser = firebase.auth().currentUser;
        if (currentUser) {
            setApplicantEmail(currentUser.email);
        }
    }, []);

    useEffect(() => {
        const fetchUserDetails = async () => {
            try {
                const userSnapshot = await db.collection('users').doc(jobDetails.createdBy).get();
                const userData = userSnapshot.data();
                setUserDetails(userData);
            } catch (error) {
                console.error('Error fetching user details', error);
            }
        };

        fetchUserDetails();
    }, [jobDetails.createdBy]);

    useEffect(() => {
        const checkOfferExists = async () => {
            const currentUser = firebase.auth().currentUser;
            if (currentUser && jobDetails.id) {
                const offersSnapshot = await db.collection('offers')
                    .where('jobPostingId', '==', jobDetails.id)
                    .where('applicantId', '==', currentUser.uid)
                    .get();
        
                setOfferExists(!offersSnapshot.empty);
            }
        };        
        checkOfferExists();
    }, [jobDetails.id]);

    const submitApplication = async () => {
        if (!offerTitle || !offerDescription || !offerPrice) {
            Alert.alert('Incomplete Information', 'Please fill in all fields.');
            return;
        }
    
        if (isNaN(parseFloat(offerPrice))) {
            Alert.alert('Invalid Price', 'Please enter a valid number for the price.');
            return;
        }
    
        const priceValue = parseFloat(offerPrice);
        if (priceValue < 10) {
            Alert.alert('Minimum Price', 'The offer price must be at least $10.');
            return;
        }
    
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.error('No user logged in');
            Alert.alert('Error', 'You must be logged in to submit an application.');
            return;
        }
    
        try {
            const offersSnapshot = await db.collection('offers')
                .where('jobPostingId', '==', jobDetails.id)
                .where('applicantId', '==', currentUser.uid)
                .get();
    
            const offerExists = !offersSnapshot.empty;
    
            if (offerExists) {
                Alert.alert('Offer Already Made', 'You have already submitted an offer for this job posting.');
                return;
            }
    
            await db.collection('offers').add({
                jobPostingId: jobDetails.id,
                offerPrice: priceValue,
                applicantId: currentUser.uid,
                applicantEmail: currentUser.email,
                advertiserEmail: userDetails.email,
                timestamp: new Date(),
                createdBy: jobDetails.createdBy,
                status: 'pending',
                title: offerTitle,
                description: offerDescription,
            });
    
            Alert.alert('Success', 'Your application has been submitted successfully.');
        } catch (error) {
            console.error('Error submitting application', error);
            Alert.alert('Error', 'There was an error submitting your application.');
        }
    };
    
    const formatPrice = (value) => {
        let numericValue = value.replace(/[^0-9.]/g, '');
        if (numericValue.length > 8) {
            numericValue = numericValue.slice(0, 8);
        }
        if (numericValue === '' || numericValue === '.') {
            return numericValue;
        }
        let [integerPart, decimalPart] = numericValue.split('.');
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        decimalPart = decimalPart ? decimalPart.slice(0, 2) : '00';
        return decimalPart.length === 1 ? `${integerPart}.${decimalPart}0` : `${integerPart}.${decimalPart}`;
    };    

    return (
        <ScrollView style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>{jobDetails.title}</Text>
                <Text style={styles.price}>${jobDetails.price}</Text>
                <Text style={styles.description}>{jobDetails.description}</Text>
                <Text style={styles.details}>Location: {jobDetails.location}</Text>
                <Text style={styles.details}>Posted: {formatDistanceToNow(new Date(jobDetails.publishedTime), { addSuffix: true })}</Text>
                <View style={styles.keywordsContainer}>
                    {jobDetails.keywords.map((keyword, index) => (
                        <Text key={index} style={styles.keyword}>{keyword}</Text>
                    ))}
                </View>
                <View style={styles.userContainer}>
                    {userDetails && (
                        <>
                            {userDetails.profilePhoto && (
                                <Image
                                    source={{ uri: userDetails.profilePhoto }}
                                    style={styles.profilePhoto}
                                />
                            )}
                            <View>
                                <Text style={styles.userName}>{userDetails.name}</Text>
                                <Text style={styles.userEmail}>{userDetails.email}</Text>
                            </View>
                        </>
                    )}
                </View>
                <TextInput
                    style={styles.inputDes}
                    value={offerTitle}
                    onChangeText={setOfferTitle}
                    placeholder="Offer Title"
                />
                <TextInput
                    style={styles.inputDes}
                    value={offerDescription}
                    onChangeText={setOfferDescription}
                    placeholder="Offer Description"
                    multiline
                />
                <TextInput
                    style={styles.input}
                    value={offerPrice}
                    onChangeText={(value) => setOfferPrice(formatPrice(value))}
                    keyboardType='numeric'
                />
                {offerExists ? (
                    <TouchableOpacity style={styles.disabledButton} disabled>
                        <Text style={styles.disabledButtonText}>Offer Already Made</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.applyButton} onPress={submitApplication}>
                        <Text style={styles.applyButtonText}>Submit Application</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerName: {
        fontSize: 20,
    },
    backButton: {
        marginLeft: 20,
        padding: 5,
    },
    card: {
        margin: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#f8f8f8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        shadowOpacity: 0.1,
        elevation: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    price: {
        fontSize: 20,
        color: '#4caf50',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    details: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    keywordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    keyword: {
        backgroundColor: '#e0e0e0',
        borderRadius: 15,
        paddingVertical: 5,
        paddingHorizontal: 10,
        marginRight: 5,
        marginBottom: 5,
        fontSize: 14,
        color: '#333',
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    profilePhoto: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    userEmail: {
        fontSize: 16,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 16,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    inputDes: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 6,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
        marginBottom: 16,
        
    },
    applyButton: {
        borderRadius: 8,
        padding: 16,
        backgroundColor: '#4caf50',
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: 18,
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledButton: {
        borderRadius: 8,
        padding: 16,
        backgroundColor: '#ccc',
        alignItems: 'center',
    },
    disabledButtonText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
});

export default ApplyScreen;
