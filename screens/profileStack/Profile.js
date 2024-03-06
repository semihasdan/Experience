import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, FlatList, TouchableOpacity, TextInput, Modal, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { Button, Card, Icon } from 'react-native-elements';
import firebase from 'firebase/compat';
import { db } from '../Firebase';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const JOBS_TO_DISPLAY_INITIAL = 3;
const Profile = ({ route, navigation }) => {
    const [userData, setUserData] = useState({});
    const [userJobs, setUserJobs] = useState([]);
    const [budget, setBudget] = useState(0.0);
    const [keywords, setKeywords] = useState([]);
    const [keywordInput, setKeywordInput] = useState('');
    const [isModalVisible, setModalVisible] = useState(false);
    const [displayedJobsCount, setDisplayedJobsCount] = useState(JOBS_TO_DISPLAY_INITIAL);
    const [isSeeMore, setIsSeeMore] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUserData();
        fetchUserJobs();
    }, []);

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const user = firebase.auth().currentUser;

            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                const fetchedUserData = userDoc.data() || {};
                fetchedUserData.balance = fetchedUserData.balance || 0.0;

                setUserData(fetchedUserData);
                setKeywords(Array.isArray(fetchedUserData.interestedKeywords) ? fetchedUserData.interestedKeywords : []);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };
    const fetchUserJobs = async () => {
        try {
            const user = firebase.auth().currentUser;

            if (user) {
                const unsubscribe = db.collection('jobPostings').where('createdBy', '==', user.uid)
                    .onSnapshot((snapshot) => {
                        const jobsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setUserJobs(jobsData);
                    });

                return () => unsubscribe();
            }
        } catch (error) {
            console.error('Error fetching user jobs:', error);
        }
    };
    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('email');
            await AsyncStorage.removeItem('password');
            await firebase.auth().signOut();           
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const handleRemoveJob = async (jobId, jobTitle) => {
        try {
            if (jobTitle.startsWith('[Deleted]')) {
                Alert.alert('Warring', 'The ad has already been deleted.', [
                    { text: 'Ok' },
                ]);
                return;
            }
            const jobSnapshot = await db.collection('jobPostings').doc(jobId).get();
            const jobData = jobSnapshot.data();
            await db.collection('jobPostings').doc(jobId).update({
                status: 'deleted',
                title: `[Deleted] - ${jobData.title}`,
            });
            fetchUserJobs();
        } catch (error) {
            console.error('Error removing job:', error);
        }
    };



    const renderJobItem = ({ item }) => (
        <Card containerStyle={styles.jobCard}>
            <Card.Title>{item.title}</Card.Title>
            <Card.Divider />
            <Text>{item.description}</Text>
            <Text>{item.location}</Text>
            <Text>{item.price}</Text>
            <View style={styles.keywordsContainer}>
                {item.keywords?.map((keyword) => (
                    <View key={keyword}>
                        <Text style={styles.keywordsText}>{keyword}</Text>
                    </View>
                )) || <Text style={styles.keywordsText}>None</Text>}
            </View>
            <View style={styles.removeButtonContainer}>
                <TouchableOpacity onPress={() => handleRemoveJob(item.id, item.title)}>
                    <Icon name="delete" type="material" size={20} color="#FF0000" />
                </TouchableOpacity>
            </View>
        </Card>
    );

    const handleAddKeyword = async () => {
        if (keywordInput.trim() !== '') {
            const updatedKeywords = [...keywords, keywordInput];
            setKeywords(updatedKeywords);
            setKeywordInput('');
            try {
                const user = firebase.auth().currentUser;

                if (user) {
                    await db.collection('users').doc(user.uid).update({
                        interestedKeywords: updatedKeywords,
                    });
                }
            } catch (error) {
                console.error('Error saving keywords:', error);
            }
        }
    };

    const handleRemoveKeyword = async (index) => {
        const updatedKeywords = [...keywords];
        updatedKeywords.splice(index, 1);
        setKeywords(updatedKeywords);

        try {
            const user = firebase.auth().currentUser;

            if (user) {
                await db.collection('users').doc(user.uid).update({
                    interestedKeywords: updatedKeywords,
                });
            }
        } catch (error) {
            console.error('Error saving keywords:', error);
        }
    };

    const updateBudget = async (amount) => {
        try {
            const user = firebase.auth().currentUser;
    
            if (user) {
                const updatedBalance = userData.balance + amount;
                const currentDate = new Date();
                const dateTimeString = currentDate.toISOString();
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
                await db.collection('users').doc(user.uid).update({
                    balance: updatedBalance,
                    transactions: firebase.firestore.FieldValue.arrayUnion({
                        amount: amount,
                        timestamp: dateTimeString,
                        timezone: timezone,
                        status: "Getting balance by card."
                    }),
                });
                setUserData((prevUserData) => ({
                    ...prevUserData,
                    balance: updatedBalance,
                }));
    
                setModalVisible(false);
            }
        } catch (error) {
            console.error('Error updating budget:', error);
        }
    };
    
    const handleSeeMoreToggle = () => {
        if (isSeeMore) {
            setDisplayedJobsCount(userJobs.length);
        } else {
            setDisplayedJobsCount(JOBS_TO_DISPLAY_INITIAL);
        }
        setIsSeeMore(!isSeeMore);
    };

    return (
        <View style={styles.container}>
          <View style={styles.containerIn}>
            <FlatList
                data={userJobs.slice(0, displayedJobsCount)}
                keyExtractor={(item) => item.id}
                renderItem={renderJobItem}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={
                    <>
                        <View style={styles.profileSection}>
                            <View>
                                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                    <MaterialCommunityIcons name="arrow-left" size={25} color="#000" />
                                </TouchableOpacity>
                            </View>
                            <Image source={{ uri: userData.profilePhoto || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUuYxlRTWhs8r8sInEW_lRbEtiybKkmGjKtAD3TNCxer01z0j-iqFJApomq0b5yEMJYo4&usqp=CAU' }} style={styles.profilePhoto} />

                            <Text style={styles.name}>{`${userData.name} ${userData.surname}`}</Text>
                            <Text style={styles.email}>{userData.email}</Text>
                            <View style={{ flexDirection: `row` }}>
                            <Text style={styles.budget}>{userData && userData.balance ? userData.balance.toFixed(2) : '0.00'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.budgetIcon}>
                                    <MaterialCommunityIcons name="wallet-plus-outline" size={25} color="#000" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => navigation.navigate('Accounting')} style={styles.bookIcon}>
                                    <MaterialCommunityIcons name="checkbook" size={25} color="#000" />
                                </TouchableOpacity>
                            </View>                          
                        </View>
                        <View style={styles.keywordsSection}>
                            <Text style={styles.sectionHeader}>Key Experiences You're Interested In</Text>
                            <View style={styles.keywordsContainer}>
                                {keywords.map((keyword, index) => (
                                    <View key={index} style={styles.keywordItem}>
                                        <Text style={styles.keywordText}>{keyword}</Text>
                                        <TouchableOpacity onPress={() => handleRemoveKeyword(index)}>
                                            <MaterialCommunityIcons name="close" size={20} color="black" />
                                        </TouchableOpacity>
                                        
                                    </View>
                                    
                                ))}
                            </View>
                            <View style={styles.keywordInputContainer}>
                                <TextInput
                                    style={styles.keywordsInput}
                                    placeholder="Enter keywords"
                                    value={keywordInput}
                                    onChangeText={setKeywordInput}
                                    onSubmitEditing={handleAddKeyword}
                                />
                            </View>
                        </View>
                        <View style={styles.cvSection}>
                            <Button
                                title="Edit CV"
                                type="outline"
                                onPress={() => navigation.navigate('Cv')}
                                containerStyle={styles.buttonContainer}
                                buttonStyle={styles.button}
                                titleStyle={styles.buttonText}
                            />
                            <Button
                                title="Log out"
                                onPress={handleLogout}
                                containerStyle={styles.logoutButtonContainer}
                                buttonStyle={styles.logoutButton}
                                titleStyle={styles.logoutButtonText}
                            />
                            <Button
                                title="See More"
                                onPress={handleSeeMoreToggle}
                                containerStyle={styles.logoutButtonContainer}
                                buttonStyle={styles.seeMoreButton}
                                titleStyle={styles.seeMoreButtonText}
                            />
                        </View>

                    </>
                }             
            />
            <Modal
                animationType="slide"
                transparent={true}
                visible={isModalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>Add to Budget</Text>
                        <Button
                            title="10"
                            onPress={() => updateBudget(10)}
                            buttonStyle={styles.modalButton}
                        />
                        <Button
                            title="100"
                            onPress={() => updateBudget(100)}
                            buttonStyle={styles.modalButton}
                        />
                        <Button
                            title="1000"
                            onPress={() => updateBudget(1000)}
                            buttonStyle={styles.modalButton}
                        />
                        <Button
                            title="Cancel"
                            onPress={() => setModalVisible(false)}
                            buttonStyle={styles.cancelButton}
                        />
                    </View>
                </View>
            </Modal>
            {userJobs.length > JOBS_TO_DISPLAY_INITIAL && (
                <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={handleSeeMoreToggle}
                >
                    <Text style={styles.seeMoreButtonText}>
                        {isSeeMore ? 'See More' : 'See Less'}
                    </Text>
                </TouchableOpacity>
            )}          
         </View>
             {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007bff" />
                </View>
                )}
        </View>
    );
};

const { width, height } = Dimensions.get('window');

const rw = (num) => (width * num) / 100;
const rh = (num) => (height * num) / 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    containerIn: {
        flex: 1,
        top: 50,
        paddingBottom: 50,
    },
    backButton: {
        position: 'absolute',
        right:162
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        backgroundColor: '#f7f7f7',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    listContainer: {
        flexGrow: 1,
    },
    cvSection: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    profilePhoto: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#5cb85c',
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    email: {
        fontSize: 16,
        color: 'gray',
        marginBottom: 15,
    },
    budget: {
        fontSize: 16,
        textAlign: 'center',
        color: '#666',
        paddingHorizontal: 10,
    },
    budgetIcon: {
        fontSize: 25,
        textAlign: 'center',
        color: '#666',
        marginBottom: 10,
    },
    bookIcon: {
        position: 'absolute',
        fontSize: 16,
        left: 220,
        color: '#666',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    cvText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
    },
    logoutButtonContainer: {
        marginVertical: 20,
        paddingHorizontal: 20,
    },
    logoutButton: {
        backgroundColor: '#f44336',
        paddingVertical: 12,
        borderRadius: 10,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    jobCard: {
        margin: 10,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    removeButtonContainer: {
        flexDirection: 'row-reverse',
        marginTop: 10,
    },
    keywordsSection: {
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    keywordsInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 15,
        fontSize: 16,
        color: '#333',
        backgroundColor: '#fff',
        flexGrow: 1,
        marginRight: 10,
    },
    keywordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    keywordItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e4e4e4',
        borderRadius: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        margin: 5,
    },
    keywordText: {
        fontSize: 14,
        color: '#333',
    },
    keywordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    button: {
        backgroundColor: '#5cb85c',
        borderRadius: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15,
    },
    modalButton: {
        backgroundColor: "#2196F3",
        borderRadius: 10,
        width: 200,
        padding: 10,
        marginVertical: 5,
    },
    cancelButton: {
        backgroundColor: "red",
        borderRadius: 10,
        width: 200,
        padding: 10,
        marginVertical: 5,
    },
    keywordsText: {
        fontSize: rw(3.5),
        fontWeight: 'bold',
        color: '#333',
        backgroundColor: '#e0e0e0',
        borderRadius: rw(8),
        padding: rw(2),
        marginRight: rw(2),
        marginBottom: rh(0.5),
        borderWidth: 1,
        borderColor: '#e0e0e0',

    },
    keywordsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        marginTop: rh(0.5),
        marginBottom: rh(1),
    },
    seeMoreButton: {
        backgroundColor: 'gray',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginVertical: 0,
    },
    seeMoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      },
});
export default Profile;
