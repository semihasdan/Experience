import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, SafeAreaView, Dimensions, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { db } from '../Firebase';
import { formatDistanceToNow } from 'date-fns';
import firebase from 'firebase/compat';
import Logo from '../../assets/Logo.png';

const Main = ({ navigation }) => {
    const [selectedOption, setSelectedOption] = useState('Best Matches');
    const [savedJobs, setSavedJobs] = useState([]);
    const [jobPostings, setJobPostings] = useState([]);
    const [userData, setUserData] = useState({});
    const default_profile_photo_url = `https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQUuYxlRTWhs8r8sInEW_lRbEtiybKkmGjKtAD3TNCxer01z0j-iqFJApomq0b5yEMJYo4&usqp=CAU`
    const [showFullDescription, setShowFullDescription] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = firebase.auth().currentUser;

                if (user) {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    const fetchedUserData = userDoc.data() || {};
                    setUserData(fetchedUserData);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
    }, []);
    useEffect(() => {
        const fetchJobPostings = async () => {
            try {
                const snapshot = await db.collection('jobPostings').get();
                const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
                setJobPostings(data);
            } catch (error) {
                console.error('Error fetching job postings', error);
            }
        };
        fetchJobPostings();

        const unsubscribe = db.collection('jobPostings').onSnapshot((snapshot) => {
            const updatedJobPostings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setJobPostings(updatedJobPostings);
        });

        return () => unsubscribe();
    }, []);
    const goToProfile = () => {
        navigation.navigate('Profile');
    };
    const filteredJobPostings = () => {
        const userInterestedKeywords = userData.interestedKeywords || [];

        switch (selectedOption) {
            case 'Best Matches':
                return jobPostings
                    .filter((job) => job.status !== 'deleted')
                    .sort((a, b) => {
                        const aMatchCount = a.keywords?.filter((keyword) => userInterestedKeywords.includes(keyword)).length || 0;
                        const bMatchCount = b.keywords?.filter((keyword) => userInterestedKeywords.includes(keyword)).length || 0;
                        return bMatchCount - aMatchCount;
                    });
            case 'Most Recent':
                return jobPostings
                    .filter((job) => job.status !== 'deleted')
                    .sort((a, b) => new Date(b.publishedTime) - new Date(a.publishedTime));
            case 'Saved Jobs':
                return savedJobs.filter((job) => job.status !== 'deleted');
            default:
                return jobPostings.filter((job) => job.status !== 'deleted');
        }
    };
    const handleSaveJob = async (job) => {
        try {
            const currentUser = firebase.auth().currentUser;

            if (!currentUser) {
                console.error('User not logged in');
                return;
            }

            const isJobSaved = savedJobs.find((savedJob) => savedJob.id === job.id);

            if (isJobSaved) {
                job.savedBy = job.savedBy.filter((userId) => userId !== currentUser.uid);
            } else {
                job.savedBy = [...(job.savedBy || []), currentUser.uid];
            }

            await db.collection('jobPostings').doc(job.id).update({ savedBy: job.savedBy });

            const snapshot = await db.collection('jobPostings').get();
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setJobPostings(data);

            setSavedJobs(data.filter((job) => job.savedBy && job.savedBy.includes(currentUser.uid)));
        } catch (error) {
            console.error('Error saving job:', error);
        }
    };
    const renderOptionButton = (option) => (
        <TouchableOpacity
            style={[
                styles.optionButton,
                { backgroundColor: selectedOption === option ? '#008000' : '#fff' },
            ]}
            onPress={() => setSelectedOption(option)}
        >
            <Text
                style={[
                    styles.optionText,
                    { color: selectedOption === option ? '#fff' : '#008000' },
                ]}
            >
                {option}
            </Text>
        </TouchableOpacity>
    );
    const renderJobItem = ({ item }) => {
        const timeDifference = formatDistanceToNow(new Date(item.publishedTime), { addSuffix: true });
        const hasSaved = savedJobs.find((savedJob) => savedJob.id === item.id);
    
        const isUserCreatedJob = item.createdBy === firebase.auth().currentUser?.uid;
    
        return (
            <View style={styles.jobContainer}>
                <View style={styles.jobDetails}>
                    <Text style={styles.jobTitle}>{item.title}</Text>
                    <Text style={styles.jobDescription}>
                    {showFullDescription === item.id ? item.description : item.description.length > 200 ? `${item.description.slice(0, 200)}...` : item.description}
                        {item.description.length > 200 && (
                            <Text
                                style={{ color: 'green', fontWeight: 'bold' }}
                                onPress={() => setShowFullDescription(showFullDescription === item.id ? null : item.id)}
                            >
                                {showFullDescription === item.id ? ' see less' : ' see more'}
                            </Text>
                        )}
                    </Text>
                    <Text style={styles.jobDescription}>
                        <Text style={{ fontWeight: 'bold' }}>Expected Experience: </Text>
                        {item.skills}
                    </Text>
                    <View style={styles.infoContainer}>
                        <Icon name="map-marker" size={16} color="#008000" style={styles.icon} />
                        <Text style={styles.jobInfo}>{item.location}</Text>
                    </View>
                    <View style={styles.infoContainer}>
                        <Text style={styles.jobInfo}>{timeDifference}   -</Text>
                        <Text style={styles.jobInfo}>{item.price}$</Text>
                    </View>
                    <View style={styles.keywordsContainer}>
                        {item.keywords?.map((keyword) => (
                            <View key={keyword}>
                                <Text style={styles.keywordsText}>{keyword}</Text>
                            </View>
                        )) || <Text style={styles.keywordsText}>None</Text>}
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={() => null} style={styles.shareButton}>
                            <Icon name="share-variant" size={24} color="#333" />
                        </TouchableOpacity>
                        {!isUserCreatedJob && (
                            <TouchableOpacity onPress={() => handleSaveJob(item)} style={styles.savedButton}>
                                <Icon name={hasSaved ? 'heart' : 'heart-outline'} size={24} color={hasSaved ? 'red' : 'black'} />
                            </TouchableOpacity>
                        )}
                        {!isUserCreatedJob ? (
                            <TouchableOpacity onPress={() => navigation.navigate('ApplyScreen', { jobDetails: item })} style={styles.applyButton}>
                                <Text style={styles.applyButtonText}>Post Details</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.yourAd, styles.userCreatedJobButton]}>
                                <Text style={styles.applyButtonText}>Your Posting</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };    
    return (
        <View style={styles.container}>
        <SafeAreaView style={styles.containerIn}>
            <TouchableOpacity onPress={goToProfile} style={styles.profilePhotoContainer}>
                <Image
                    source={{ uri: userData.profilePhoto || default_profile_photo_url }}
                    style={styles.profilePhoto}
                />
            </TouchableOpacity>
            <View style={styles.header}>
                <Text style={styles.headerText}>Postings</Text>
                <Image source={Logo} style={styles.headerLogo}/>
            </View>
            <View style={styles.optionsContainer}>
                {renderOptionButton('Best Matches')}
                {renderOptionButton('Most Recent')}
                {renderOptionButton('Saved Jobs')}
            </View>
            <FlatList
                data={filteredJobPostings()}
                keyExtractor={(item) => item.id}
                renderItem={renderJobItem}
            />
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('CreateJobAd')}
            >
                <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
        </SafeAreaView>
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
        paddingTop: rh(2),
        paddingHorizontal: rw(2),
        marginTop: rh(5),
    },
    header: {
        alignItems: 'center',
        flexDirection: "row",
        justifyContent: "center"
    },
    headerText: {
        position: "absolute",
        fontSize: rw(6),
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        top: rh(1),
    },
    headerLogo: {
        width: rw(18),
        height: rh(6),
        bottom: rw(2),
        left: rw(40),
    },        
    profilePhotoContainer: {
        position: 'absolute',
        top: rh(2),
        left: rw(4),
        zIndex: 1,
        backgroundColor: '#008000',
        borderRadius: 20,
    },
    profilePhoto: {
        width: rw(10),
        height: rw(10),
        borderRadius: rw(5),
        borderWidth: 2,
        borderColor: '#008000',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: rh(0.5),
        marginHorizontal: rw(0.3),
    },
    optionButton: {
        paddingVertical: rh(1.25),
        paddingHorizontal: rw(2),
        borderRadius: rw(5),
        borderWidth: 1,
        borderColor: '#008000',
        backgroundColor: '#fff',
        marginHorizontal: rw(1),
    },
    optionText: {
        fontSize: rw(4),
    },
    jobContainer: {
        backgroundColor: '#fff',
        borderRadius: rw(2.5),
        padding: rw(2.5),
        marginVertical: rh(0.5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: rw(1),
        elevation: 3,
    },
    jobDetails: {
        flex: 1,
    },
    jobTitle: {
        fontSize: rw(5),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: rh(0.5),
    },
    jobDescription: {
        fontSize: rw(4),
        color: '#555',
        marginBottom: rh(1),
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: rh(0.5),
    },
    buttonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: rh(1),
    },
    savedButton: {
        marginRight: rw(2.5),
    },
    jobInfo: {
        fontSize: rw(3.5),
        color: 'gray',
        marginRight: rw(2.5),
    },
    applyButton: {
        backgroundColor: '#008000',
        borderRadius: rw(5),
        paddingVertical: rh(1.25),
        paddingHorizontal: rw(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: rh(0.25) },
        shadowOpacity: 0.2,
        shadowRadius: rw(1),
        elevation: 3,
    },
    applyButtonText: {
        color: 'white',
        fontSize: rw(4),
        fontWeight: 'bold',
    },
    yourAd: {
        backgroundColor: '#a9ffab',
        borderRadius: rw(5),
        paddingVertical: rh(1.25),
        paddingHorizontal: rw(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: rh(0.25) },
        shadowOpacity: 0.2,
        shadowRadius: rw(1),
        elevation: 3,
    },
    shareButton: {
        position: 'absolute',
        right: rw(89),
    },
    addButton: {
        position: 'absolute',
        bottom: rh(2),
        right: rw(5),
        backgroundColor: '#008786',
        borderWidth: 2,
        borderColor: '#003030',
        borderRadius: 50,
        width: rw(12),
        height: rw(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButtonText: {
        color: 'white',
        fontSize: rw(7),
        fontWeight: 'bold',
        
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
});
export default Main;
