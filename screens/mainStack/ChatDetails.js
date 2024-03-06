import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { db } from '../Firebase';
import { formatDistanceToNow } from 'date-fns';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ChatDetails = ({ route, navigation }) => {
    const { jobDetails } = route.params;
    const [userDetails, setUserDetails] = useState(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            headerTitle: () => (
                <View>
                    <Text style={styles.headerName}>Post Details</Text>
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
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    headerName: {
        fontSize: 20,
    },
    backButton: {
        marginLeft: 20,
        padding: 5,
    },
    card: {
        borderRadius: 10,
        padding: 16,
        margin: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#555',
        marginBottom: 16,
    },
    infoSection: {
        marginBottom: 16,
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#d35400',
        marginBottom: 8,
    },
    details: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    keywordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    keyword: {
        backgroundColor: '#ecf0f1',
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
    },
    profilePhoto: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 16,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 16,
        color: '#555',
    },
});

export default ChatDetails;
